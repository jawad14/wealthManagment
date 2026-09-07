/**
 * Transport-agnostic handlers for the properties module.
 */
import { resolveAsOfDate } from '@/shared/config/app-config';
import { asId } from '@/shared/types/common';
import type { Money } from '@/shared/lib/money';
import { propertiesService } from './service';
import type { Occupancy, Property, ValuationStatus } from './model';
import type { PropertyQuery } from './validation';
import { accessService } from '@/modules/access/service';

export interface PropertySummary {
  readonly property: Property;
  readonly valuation: ValuationStatus;
  readonly occupancy: Occupancy;
  readonly occupancyLabel: string;
}

export const propertiesApi = {
  list(query: PropertyQuery): { readonly asOf: string; readonly items: readonly PropertySummary[] } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('property.read');
    const asOf = query.asOf ?? resolveAsOfDate();
    const items = propertiesService
      .applyFilter(propertiesService.list(), query.filter, asOf)
      .map((property) => ({
        property,
        valuation: propertiesService.valuationStatus(property.id, asOf),
        occupancy: propertiesService.occupancy(property.id, asOf),
        occupancyLabel: propertiesService.occupancyLabel(property.id, asOf),
      }));
    return { asOf, items };
  },

  get(propertyId: string, asOf?: string): PropertySummary & { readonly valuationDetail: string | null } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('property.read');
    const resolvedAsOf = asOf ?? resolveAsOfDate();
    const id = asId<'Property'>(propertyId);
    const property = propertiesService.require(id);
    return {
      property,
      valuation: propertiesService.valuationStatus(id, resolvedAsOf),
      occupancy: propertiesService.occupancy(id, resolvedAsOf),
      occupancyLabel: propertiesService.occupancyLabel(id, resolvedAsOf),
      valuationDetail: propertiesService.valuationDetailLabel(id, resolvedAsOf),
    };
  },

  /** Properties whose valuation has aged past the staleness window. */
  stale(asOf?: string): readonly { readonly property: Property; readonly value: Money | null }[] {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('property.read');
    const resolvedAsOf = asOf ?? resolveAsOfDate();
    return propertiesService.staleValuationProperties(resolvedAsOf).map((property) => ({
      property,
      value: propertiesService.valuationStatus(property.id, resolvedAsOf).valuation?.amount ?? null,
    }));
  },
};
