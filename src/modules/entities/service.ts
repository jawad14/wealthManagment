/**
 * Entities business logic and the BR-02 consolidation primitives.
 *
 * This module deliberately knows nothing about valuations or debt — it resolves
 * *who owns what and by how much*. The `dashboard` module combines these claims
 * with property values and loan balances to produce monetary totals, which keeps
 * the ownership rules testable in isolation.
 *
 * `entityHoldings` is the one place money appears, and it still reads no
 * valuation or loan itself: the caller hands those in as `HoldingsSources`.
 */
import { NotFoundError } from '@/shared/lib/errors';
import { addMoney, allocateMoney, money, scaleMoney, subtractMoney, sumMoney, type Money } from '@/shared/lib/money';
import type { EntityId, IsoDate, PropertyId } from '@/shared/types/common';
import { entitiesRepository } from './repository';
import {
  ENTITY_KIND_LABELS,
  isControlRelation,
  type ConsolidationMethod,
  type Entity,
  type EntityKind,
  type OwnershipClaim,
  type Relationship,
} from './model';

export interface EntityWithRelationships {
  readonly entity: Entity;
  readonly kindLabel: string;
  /** Relationship labels rendered on the entity card. */
  readonly relationshipLabels: readonly string[];
  readonly ownership: readonly Relationship[];
  readonly control: readonly Relationship[];
}

export type EntityFilter = 'all' | EntityKind;

/** One facility an entity may be a borrower of, as seen by `entityHoldings`. */
export interface HoldingsFacility {
  readonly borrowerEntityIds: readonly EntityId[];
  /** Positive magnitude owed. Receivables are assets and must not be passed. */
  readonly balance: Money;
  /**
   * Properties securing the facility with their relative allocation weights.
   * Empty for unsecured debt, and for a pool with no allocation policy — that
   * debt still counts against the borrower, but against no single property.
   */
  readonly security: readonly { readonly propertyId: PropertyId; readonly weight: number }[];
}

/**
 * Valuation and debt lookups `entityHoldings` needs.
 *
 * `properties` and `loans` sit above this module in the dependency order, so
 * the caller supplies them. `dashboardService.entityHoldings` is the wired-up
 * entry point.
 */
export interface HoldingsSources {
  propertyNameOf(propertyId: PropertyId): string;
  /** The valuation effective on `asOf`, or null when the property has none. */
  valuationOf(propertyId: PropertyId, asOf: IsoDate): Money | null;
  readonly facilities: readonly HoldingsFacility[];
}

export interface EntityHolding {
  readonly propertyId: PropertyId;
  readonly propertyName: string;
  /** 0–100. */
  readonly sharePercent: number;
  /** Valuation × share. Zero when the property has no valuation. */
  readonly attributedValue: Money;
  /** This entity's borrowed debt that is secured against the property. */
  readonly debt: Money;
}

export interface EntityHoldings {
  readonly grossAssets: Money;
  /** Everything the entity borrowed, including debt secured on no holding of its own. */
  readonly attributedDebt: Money;
  readonly netEquity: Money;
  readonly holdings: readonly EntityHolding[];
}

export const entitiesService = {
  listEntities(): readonly Entity[] {
    return entitiesRepository.listEntities();
  },

  requireEntity(id: EntityId): Entity {
    const entity = entitiesRepository.findEntity(id);
    if (!entity) throw new NotFoundError('Entity', id);
    return entity;
  },

  countByKind(): Record<EntityFilter, number> {
    const entities = entitiesRepository.listEntities();
    return {
      all: entities.length,
      individual: entities.filter((entity) => entity.kind === 'individual').length,
      company: entities.filter((entity) => entity.kind === 'company').length,
      trust: entities.filter((entity) => entity.kind === 'trust').length,
      smsf: entities.filter((entity) => entity.kind === 'smsf').length,
    };
  },

  /** Entities with their effective relationships, filtered by kind. */
  listWithRelationships(asOf: IsoDate, filter: EntityFilter = 'all'): readonly EntityWithRelationships[] {
    return entitiesRepository
      .listEntities()
      .filter((entity) => filter === 'all' || entity.kind === filter)
      .map((entity) => {
        const relations = entitiesRepository.listRelationshipsForEntity(entity.id, asOf);
        return {
          entity,
          kindLabel: ENTITY_KIND_LABELS[entity.kind],
          relationshipLabels: relations.map((relation) => relation.label),
          ownership: relations.filter((relation) => !isControlRelation(relation.kind)),
          control: relations.filter((relation) => isControlRelation(relation.kind)),
        };
      });
  },

  /**
   * Resolve every direct ownership claim effective on `asOf`.
   *
   * Claims are *direct* by design: a company's shareholder does not inherit a
   * claim on the company's properties, because that would count the same asset
   * twice — once through the property and once through the company's equity
   * (BR-02). Company and trust holdings are attributed to the company or trust
   * itself, which is exactly what the ownership view shows.
   */
  resolveOwnershipClaims(asOf: IsoDate): readonly OwnershipClaim[] {
    return entitiesRepository
      .listOwnershipRelations(asOf)
      .flatMap<OwnershipClaim>((relation) => {
        if (relation.target.type !== 'property' || relation.sharePercent === undefined) return [];
        return [
          {
            ownerEntityId: relation.subjectEntityId,
            propertyId: relation.target.propertyId,
            share: relation.sharePercent / 100,
          },
        ];
      });
  },

  /** The owners of one property with their fractional shares. */
  ownersOf(propertyId: PropertyId, asOf: IsoDate): readonly OwnershipClaim[] {
    return entitiesRepository.listOwnersOfProperty(propertyId, asOf).flatMap<OwnershipClaim>((relation) => {
      if (relation.target.type !== 'property' || relation.sharePercent === undefined) return [];
      return [{ ownerEntityId: relation.subjectEntityId, propertyId, share: relation.sharePercent / 100 }];
    });
  },

  /**
   * Total share of a property that has been allocated to owners.
   * A result other than 1 is an ownership gap the dashboard surfaces for action.
   */
  allocatedShareOf(propertyId: PropertyId, asOf: IsoDate): number {
    return entitiesService
      .ownersOf(propertyId, asOf)
      .reduce((total, claim) => total + claim.share, 0);
  },

  /** Entities whose holdings enter portfolio totals. */
  consolidatedEntityIds(method: ConsolidationMethod = 'look-through'): readonly EntityId[] {
    return entitiesRepository
      .listEntities()
      .filter((entity) => entity.consolidation === method)
      .map((entity) => entity.id);
  },

  /**
   * One entity's balance sheet over the properties it directly owns (BR-02).
   *
   * Assets follow ownership share; debt follows the borrower, split evenly
   * between a facility's consolidated borrowers — the same attribution the
   * dashboard's ownership positions use, so the two views reconcile. A
   * borrower's part of a facility is then spread across the securing
   * properties by weight, and only lands on a holding the entity owns.
   */
  entityHoldings(entityId: EntityId, asOf: IsoDate, sources: HoldingsSources): EntityHoldings {
    entitiesService.requireEntity(entityId);
    const consolidated = entitiesService.consolidatedEntityIds();

    let attributedDebt = money(0);
    const debtByProperty = new Map<PropertyId, Money>();

    sources.facilities.forEach((facility) => {
      const holders = facility.borrowerEntityIds.filter((id) => consolidated.includes(id));
      const index = holders.indexOf(entityId);
      if (index === -1) return;

      const borrowed = allocateMoney(facility.balance, holders.map(() => 1))[index] ?? money(0);
      attributedDebt = addMoney(attributedDebt, borrowed);

      if (facility.security.length === 0) return;
      const parts = allocateMoney(borrowed, facility.security.map((entry) => entry.weight));
      facility.security.forEach((entry, position) => {
        const part = parts[position] ?? money(0);
        debtByProperty.set(entry.propertyId, addMoney(debtByProperty.get(entry.propertyId) ?? money(0), part));
      });
    });

    const holdings = entitiesService
      .resolveOwnershipClaims(asOf)
      .filter((claim) => claim.ownerEntityId === entityId)
      .map<EntityHolding>((claim) => {
        const valuation = sources.valuationOf(claim.propertyId, asOf);
        return {
          propertyId: claim.propertyId,
          propertyName: sources.propertyNameOf(claim.propertyId),
          sharePercent: claim.share * 100,
          attributedValue: valuation ? scaleMoney(valuation, claim.share) : money(0),
          debt: debtByProperty.get(claim.propertyId) ?? money(0),
        };
      });

    const grossAssets = sumMoney(holdings.map((holding) => holding.attributedValue));
    return { grossAssets, attributedDebt, netEquity: subtractMoney(grossAssets, attributedDebt), holdings };
  },

  /** Human label for an entity id, used across other modules' views. */
  nameOf(id: EntityId): string {
    return entitiesRepository.findEntity(id)?.name ?? 'Unknown entity';
  },
};
