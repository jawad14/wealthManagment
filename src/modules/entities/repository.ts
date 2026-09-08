/**
 * Entities data access.
 */
import { createCollection } from '@/server/db/collection';
import type { EntityId, IsoDate, PropertyId } from '@/shared/types/common';
import { assertShareIntegrity, isControlRelation, type Entity, type Relationship } from './model';
import { seedEntities, seedRelationships } from './data/seed';

const entities = createCollection<Entity>('entities.entities', seedEntities);

const relationships = createCollection<Relationship>('entities.relationships', () => {
  const seeded = seedRelationships();
  // Fail fast at load time if the graph violates BR-02.
  seeded.forEach(assertShareIntegrity);
  return seeded;
});

/** True when the relationship is in force on `asOf`. */
function isEffective(relationship: Relationship, asOf: IsoDate): boolean {
  return relationship.from <= asOf && (relationship.to === null || relationship.to >= asOf);
}

export const entitiesRepository = {
  listEntities: (): readonly Entity[] => entities.list(),
  insertEntity: (entity: Entity): Entity => entities.insert(entity),
  /** Guards BR-02 before the relationship reaches storage. */
  insertRelationship: (relationship: Relationship): Relationship => {
    assertShareIntegrity(relationship);
    return relationships.insert(relationship);
  },
  findEntity: (id: EntityId): Entity | undefined => entities.find(id),
  listRelationships: (): readonly Relationship[] => relationships.list(),

  /** All relationships where `entityId` is the subject, effective on `asOf`. */
  listRelationshipsForEntity: (entityId: EntityId, asOf: IsoDate): readonly Relationship[] =>
    relationships.where((relation) => relation.subjectEntityId === entityId && isEffective(relation, asOf)),

  /** Ownership relations only — the input to consolidation. */
  listOwnershipRelations: (asOf: IsoDate): readonly Relationship[] =>
    relationships.where((relation) => !isControlRelation(relation.kind) && isEffective(relation, asOf)),

  /** Every owner of a property with their share on `asOf`. */
  listOwnersOfProperty: (propertyId: PropertyId, asOf: IsoDate): readonly Relationship[] =>
    relationships.where(
      (relation) =>
        relation.kind === 'owns' &&
        relation.target.type === 'property' &&
        relation.target.propertyId === propertyId &&
        isEffective(relation, asOf),
    ),
};
