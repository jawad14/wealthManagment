/**
 * Entities & ownership domain model (FR-01, BR-02).
 *
 * The central rule this model exists to enforce: **ownership carries a share,
 * control does not**. A director, trustee or beneficiary relationship conveys no
 * percentage, so consolidation can never double-count an asset through it.
 */
import type { EntityId, IsoDate, PropertyId } from '@/shared/types/common';

export type EntityKind = 'individual' | 'company' | 'trust' | 'smsf';

export const ENTITY_KIND_LABELS: Record<EntityKind, string> = {
  individual: 'Individual',
  company: 'Company',
  trust: 'Trust',
  smsf: 'SMSF',
};

/**
 * How an entity's holdings enter portfolio totals.
 * - `look-through` — the entity's assets are consolidated at the owner's share.
 * - `manual-summary` — a read-only figure the user maintains; excluded from totals.
 * - `excluded`       — deliberately outside the portfolio.
 */
export type ConsolidationMethod = 'look-through' | 'manual-summary' | 'excluded';

export interface Entity {
  readonly id: EntityId;
  readonly name: string;
  readonly kind: EntityKind;
  /** Secondary descriptor chip, e.g. "Company · ACN 6xx xxx xxx". */
  readonly descriptor: string;
  /** Two- or three-character monogram shown in the entity icon. */
  readonly monogram: string;
  readonly consolidation: ConsolidationMethod;
  /** Explanatory chip shown beside the consolidation state, when one applies. */
  readonly consolidationNote?: string;
  /** Rendered instead of a computed figure when the entity is not consolidated. */
  readonly valueNote: string;
  readonly establishedYear?: number;
}

/** Relationships that convey a proportional claim on an asset. */
export type OwnershipRelationKind = 'owns';

/** Relationships that convey control or standing but no percentage (BR-02). */
export type ControlRelationKind = 'director-of' | 'trustee-of' | 'beneficiary-of' | 'member-of' | 'borrower-of';

export type RelationKind = OwnershipRelationKind | ControlRelationKind;

export const CONTROL_RELATION_KINDS: readonly ControlRelationKind[] = [
  'director-of',
  'trustee-of',
  'beneficiary-of',
  'member-of',
  'borrower-of',
];

export function isControlRelation(kind: RelationKind): kind is ControlRelationKind {
  return (CONTROL_RELATION_KINDS as readonly string[]).includes(kind);
}

/**
 * A dated relationship from one entity to a property or another entity.
 *
 * `sharePercent` is only meaningful when `kind === 'owns'`; the type keeps it
 * optional and `assertShareIntegrity` enforces that control relations omit it.
 */
export interface Relationship {
  readonly id: string;
  readonly subjectEntityId: EntityId;
  readonly kind: RelationKind;
  /** Target of the relationship — either a property or another entity. */
  readonly target:
    | { readonly type: 'property'; readonly propertyId: PropertyId }
    | { readonly type: 'entity'; readonly entityId: EntityId }
    | { readonly type: 'external'; readonly label: string };
  /** 0–100. Present only on ownership relations. */
  readonly sharePercent?: number;
  readonly from: IsoDate;
  readonly to: IsoDate | null;
  /** Label rendered in the entity card's relationship line. */
  readonly label: string;
}

/**
 * Guard applied when relationships are created or loaded.
 * Throws rather than silently dropping a share, because a share attached to a
 * control relation would corrupt every consolidated total.
 */
export function assertShareIntegrity(relationship: Relationship): void {
  if (isControlRelation(relationship.kind) && relationship.sharePercent !== undefined) {
    throw new Error(
      `Relationship ${relationship.id}: "${relationship.kind}" is a control relationship and cannot carry an ownership share (BR-02).`,
    );
  }
  if (relationship.kind === 'owns' && relationship.sharePercent === undefined) {
    throw new Error(`Relationship ${relationship.id}: an ownership relationship must state a share.`);
  }
}

/** A resolved ownership claim used by the consolidation engine. */
export interface OwnershipClaim {
  readonly ownerEntityId: EntityId;
  readonly propertyId: PropertyId;
  /** 0–1 fraction. */
  readonly share: number;
}
