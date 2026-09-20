/**
 * Properties business logic: valuation status, staleness and occupancy.
 *
 * Money that depends on other modules (rent, debt, arrears) is assembled by the
 * `dashboard` module, not here — this module answers only questions about the
 * asset itself, which keeps the dependency graph acyclic.
 */
import { NotFoundError, ValidationError } from '@/shared/lib/errors';
import { formatDateShort, formatMonthShort, monthsBetween, toDate } from '@/shared/lib/dates';
import { addMoney, subtractMoney } from '@/shared/lib/money';
import { STALE_VALUATION_MONTHS } from '@/shared/config/app-config';
import type { IsoDate, PropertyId } from '@/shared/types/common';
import { entitiesService } from '@/modules/entities/service';
import { propertiesRepository } from './repository';
import {
  isMarketBasis,
  VALUATION_BASIS_LABELS,
  VALUATION_BASIS_LONG_LABELS,
  type CapitalGrowth,
  type ComponentKind,
  type Occupancy,
  type OwnershipGap,
  type Property,
  type PropertyComponent,
  type Valuation,
  type ValuationStatus,
} from './model';

export type PropertyFilter = 'all' | 'rented' | 'own-home' | 'stale-valuation';

/** Format the valuation date at the precision the basis warrants. */
function formatValuationDate(valuation: Valuation): string | null {
  const date = toDate(valuation.valuedOn);
  switch (valuation.datePrecision) {
    case 'day':
      return `${formatDateShort(valuation.valuedOn)} ${date.getUTCFullYear()}`;
    case 'month':
      return `${formatMonthShort(valuation.valuedOn)} ${date.getUTCFullYear()}`;
    case 'year':
      return String(date.getUTCFullYear());
    case 'none':
      return null;
  }
}

export const propertiesService = {
  list(): readonly Property[] {
    return propertiesRepository.list();
  },

  require(id: PropertyId): Property {
    const property = propertiesRepository.find(id);
    if (!property) throw new NotFoundError('Property', id);
    return property;
  },

  /**
   * Valuation status for a property.
   *
   * A valuation older than STALE_VALUATION_MONTHS is still shown — losing an
   * asset from the portfolio because its paperwork aged would be worse than
   * showing a dated figure — but it stops being eligible to drive ratios.
   */
  valuationStatus(propertyId: PropertyId, asOf: IsoDate): ValuationStatus {
    const valuation = propertiesRepository.latestValuation(propertyId, asOf) ?? null;
    if (!valuation) {
      return {
        valuation: null,
        isStale: false,
        ageMonths: null,
        eligibleForRatios: false,
        label: 'No valuation recorded',
      };
    }

    const ageMonths = monthsBetween(valuation.valuedOn, asOf);
    // Aged out, or never a market assessment in the first place.
    const isStale = ageMonths >= STALE_VALUATION_MONTHS || !isMarketBasis(valuation.basis);
    const datePart = formatValuationDate(valuation);
    const label = [VALUATION_BASIS_LABELS[valuation.basis], datePart, isStale ? 'stale' : null]
      .filter(Boolean)
      .join(' · ');

    return { valuation, isStale, ageMonths, eligibleForRatios: !isStale, label };
  },

  /** Long-form valuation sentence used on the property detail footer. */
  valuationDetailLabel(propertyId: PropertyId, asOf: IsoDate): string | null {
    const status = propertiesService.valuationStatus(propertyId, asOf);
    if (!status.valuation) return null;
    const { valuation } = status;
    const date = toDate(valuation.valuedOn);
    return [
      VALUATION_BASIS_LONG_LABELS[valuation.basis],
      `${formatDateShort(valuation.valuedOn)} ${date.getUTCFullYear()}`,
      `confidence ${valuation.confidence}`,
    ].join(' · ');
  },

  /**
   * Capital growth: the current valuation against what the property cost (FR-02).
   *
   * The cost basis includes settlement costs, so growth is net of stamp duty and
   * legal fees rather than flattered by leaving them out. Without a purchase
   * price there is no basis, and without a valuation there is nothing to compare
   * it to — either way the growth figures are null, never zero.
   */
  capitalGrowth(propertyId: PropertyId, asOf: IsoDate): CapitalGrowth {
    const property = propertiesService.require(propertyId);
    const purchasePrice = property.purchasePrice ?? null;
    const settlementCosts = property.settlementCosts ?? null;
    const currentValuation = propertiesRepository.latestValuation(propertyId, asOf)?.amount ?? null;

    const totalCostBasis =
      purchasePrice === null ? null : settlementCosts === null ? purchasePrice : addMoney(purchasePrice, settlementCosts);
    const growthAmount =
      totalCostBasis === null || currentValuation === null ? null : subtractMoney(currentValuation, totalCostBasis);
    const growthPercent =
      growthAmount === null || totalCostBasis === null || totalCostBasis.cents <= 0
        ? null
        : growthAmount.cents / totalCostBasis.cents;

    return {
      purchasePrice,
      settlementCosts,
      settledOn: property.settledOn ?? null,
      totalCostBasis,
      currentValuation,
      growthAmount,
      growthPercent,
    };
  },

  /** Properties whose newest valuation has aged past the staleness window. */
  staleValuationProperties(asOf: IsoDate): readonly Property[] {
    return propertiesRepository
      .list()
      .filter((property) => propertiesService.valuationStatus(property.id, asOf).isStale);
  },

  listComponents(propertyId: PropertyId): readonly PropertyComponent[] {
    return propertiesRepository.listComponents(propertyId);
  },

  /**
   * Add a room or component to a property (FR-02, BR-02).
   *
   * A component is operational — it carries leases and occupancy but never a
   * valuation — so this touches nothing that feeds net worth. Labels are how
   * people tell rooms apart on a lease, so a duplicate is refused, and a
   * property has at most one "whole property" component. A whole component may
   * sit beside others — a granny flat next to the main dwelling is the case
   * this exists for.
   */
  addComponent(input: {
    readonly id: PropertyComponent['id'];
    readonly propertyId: PropertyId;
    readonly label: string;
    readonly kind: ComponentKind;
    readonly vacantSince?: IsoDate;
  }): PropertyComponent {
    const existing = propertiesRepository.listComponents(input.propertyId);

    if (existing.some((component) => component.label.toLowerCase() === input.label.toLowerCase())) {
      throw new ValidationError(`This property already has "${input.label}".`, {
        fieldErrors: { label: ['Choose a label that is not already in use on this property.'] },
      });
    }
    if (input.kind === 'whole' && existing.some((component) => component.kind === 'whole')) {
      throw new ValidationError('This property already has a whole-property component.', {
        fieldErrors: { kind: ['Only one "Whole property" component is allowed — add a room instead.'] },
      });
    }

    const position = existing.reduce((max, component) => Math.max(max, component.position), 0) + 1;
    return propertiesRepository.addComponent({ ...input, position });
  },

  /**
   * Occupancy for a property. A component is "let" when it has no `vacantSince`
   * on or before the as-of date.
   */
  occupancy(propertyId: PropertyId, asOf: IsoDate): Occupancy {
    const components = propertiesRepository.listComponents(propertyId);
    const slots = components.map((component) => ({
      componentId: component.id,
      isLet: !(component.vacantSince !== undefined && component.vacantSince <= asOf),
    }));
    const letCount = slots.filter((slot) => slot.isLet).length;
    return { total: slots.length, let: letCount, vacant: slots.length - letCount, slots };
  },

  /** Occupancy chip text: "6 rooms · 5 let", "Whole let", "Vacant". */
  occupancyLabel(propertyId: PropertyId, asOf: IsoDate): string {
    const property = propertiesService.require(propertyId);
    const occupancy = propertiesService.occupancy(propertyId, asOf);

    if (property.status === 'under-construction') return 'Under construction';
    if (property.status === 'own-home') return 'Own home';
    if (property.rentalMode === 'by-room') return `${occupancy.total} rooms · ${occupancy.let} let`;
    if (occupancy.let > 0) return 'Whole let';
    return 'Vacant';
  },

  applyFilter(properties: readonly Property[], filter: PropertyFilter, asOf: IsoDate): readonly Property[] {
    switch (filter) {
      case 'all':
        return properties;
      case 'rented':
        return properties.filter((property) => property.status === 'rented');
      case 'own-home':
        return properties.filter((property) => property.status === 'own-home');
      case 'stale-valuation':
        return properties.filter((property) => propertiesService.valuationStatus(property.id, asOf).isStale);
    }
  },

  counts(asOf: IsoDate): Record<PropertyFilter, number> {
    const properties = propertiesRepository.list();
    return {
      all: properties.length,
      rented: propertiesService.applyFilter(properties, 'rented', asOf).length,
      'own-home': propertiesService.applyFilter(properties, 'own-home', asOf).length,
      'stale-valuation': propertiesService.applyFilter(properties, 'stale-valuation', asOf).length,
    };
  },

  /**
   * Properties whose ownership shares do not add up to 100%.
   * Surfaced on the dashboard as an action, because an unallocated share means
   * portfolio totals are quietly understated.
   */
  ownershipGaps(asOf: IsoDate): readonly OwnershipGap[] {
    return propertiesRepository.list().flatMap<OwnershipGap>((property) => {
      const allocated = entitiesService.allocatedShareOf(property.id, asOf);

      if (Math.abs(allocated - 1) > 1e-9) {
        return [
          {
            propertyId: property.id,
            propertyName: property.name,
            allocatedShare: allocated,
            reason:
              allocated === 0
                ? 'no ownership recorded'
                : `only ${Math.round(allocated * 100)}% of ownership is allocated`,
          },
        ];
      }

      if (!property.consolidationMethodChosen) {
        return [
          {
            propertyId: property.id,
            propertyName: property.name,
            allocatedShare: allocated,
            reason: 'consolidation method not chosen',
          },
        ];
      }

      return [];
    });
  },
};
