/**
 * Entities business logic and the BR-02 consolidation primitives.
 *
 * This module deliberately knows nothing about valuations or debt — it resolves
 * *who owns what and by how much*. The `dashboard` module combines these claims
 * with property values and loan balances to produce monetary totals, which keeps
 * the ownership rules testable in isolation.
 */
import { NotFoundError } from '@/shared/lib/errors';
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

  /** Human label for an entity id, used across other modules' views. */
  nameOf(id: EntityId): string {
    return entitiesRepository.findEntity(id)?.name ?? 'Unknown entity';
  },
};
