/**
 * Shared bills and recoveries (FR-07).
 *
 * A utility or shared cost arrives as one bill and is split across the leases
 * that consumed it. Two rules make this module worth isolating:
 *
 *  1. **A recoverable tenant charge is not an owner expense.** The recovered
 *     portion becomes a charge against a lease; only the unrecovered remainder
 *     is the owner's cost. Counting both would double-count in consolidation.
 *
 *  2. **Splits come from an approved agreement, never from inference.** The
 *     allocation basis is stored with its source document, and an allocation
 *     whose parts do not reconcile to the bill is rejected outright.
 *
 * Recoverability and any statutory deadline are *reviewed inputs* supplied by the
 * user — the platform records them and never derives them.
 */
import type { DocumentId, IsoDate, LeaseId, PropertyId } from '@/shared/types/common';
import type { AmountBasis } from '@/shared/types/amounts';
import type { Money } from '@/shared/lib/money';

export type SharedBillCategory = 'water' | 'electricity' | 'gas' | 'internet' | 'cleaning' | 'other';

export const SHARED_BILL_CATEGORY_LABELS: Record<SharedBillCategory, string> = {
  water: 'Water',
  electricity: 'Electricity',
  gas: 'Gas',
  internet: 'Internet',
  cleaning: 'Cleaning',
  other: 'Other',
};

/**
 * How a bill is divided.
 * - `percentage` — weights are percentages of the whole.
 * - `fixed`      — each share is an explicit amount.
 * - `equal`      — divided evenly across the targets.
 */
export type AllocationBasis = 'percentage' | 'fixed' | 'equal';

export const ALLOCATION_BASIS_LABELS: Record<AllocationBasis, string> = {
  percentage: 'Percentage',
  fixed: 'Fixed amount',
  equal: 'Equal split',
};

/**
 * One share of a bill.
 *
 * `leaseId` null means the share stays with the owner — the unrecovered portion.
 * That is the distinction between a recovery and an expense.
 */
export interface BillShare {
  readonly id: string;
  readonly billId: string;
  /** Null = owner's own cost, not recoverable from a tenant. */
  readonly leaseId: LeaseId | null;
  /** Display label, e.g. "Rooms 1–3" or "Owner (common areas)". */
  readonly label: string;
  /** Weight under the bill's basis: a percentage, a fixed cent amount, or unused for `equal`. */
  readonly weight: number;
  /** The resolved amount for this share, computed by the service and stored on approval. */
  readonly amount: Money;
  readonly recoverable: boolean;
}

/**
 * The agreement authorising a split.
 *
 * An allocation may only be applied while an approved agreement covers its
 * effective date, which is what stops a split being quietly changed after the
 * fact.
 */
export interface AllocationAgreement {
  readonly id: string;
  readonly propertyId: PropertyId;
  readonly basis: AllocationBasis;
  /** Human description, e.g. "60/40 to Rooms 1–3 and 4–6 per agreement". */
  readonly description: string;
  readonly approved: boolean;
  readonly approvedOn?: IsoDate;
  /** The signed agreement backing the split. */
  readonly documentId?: DocumentId;
  readonly effectiveFrom: IsoDate;
  readonly effectiveTo: IsoDate | null;
}

export interface SharedBill {
  readonly id: string;
  readonly propertyId: PropertyId;
  readonly category: SharedBillCategory;
  readonly supplier: string;
  /** The bill's own reference, e.g. "4471". */
  readonly reference?: string;
  readonly total: Money;
  /** Period the bill covers — drives which leases were active for it. */
  readonly periodFrom: IsoDate;
  readonly periodTo: IsoDate;
  readonly dueOn: IsoDate;
  /** BR-06: the period the cost belongs to, distinct from when it was entered. */
  readonly effectiveOn: IsoDate;
  readonly postedAt: string;
  readonly basisAmount: AmountBasis;
  readonly agreementId: string | null;
  readonly sourceDocumentId?: DocumentId;
  /**
   * Recorded from the user's own review, never inferred. Null means "not yet
   * reviewed" — deliberately distinct from "not recoverable".
   */
  readonly recoveryReviewedOn: IsoDate | null;
  readonly recoveryDeadline: IsoDate | null;
}

/** Why an allocation was rejected. Surfaced to the user rather than silently corrected. */
export type AllocationRejection =
  | 'no-agreement'
  | 'agreement-not-approved'
  | 'agreement-not-effective'
  | 'shares-do-not-reconcile'
  | 'no-active-leases';

export const ALLOCATION_REJECTION_LABELS: Record<AllocationRejection, string> = {
  'no-agreement': 'No allocation agreement is recorded for this property',
  'agreement-not-approved': 'The allocation agreement has not been approved',
  'agreement-not-effective': 'No approved agreement covers this bill’s period',
  'shares-do-not-reconcile': 'The shares do not add up to the bill total',
  'no-active-leases': 'No leases were active during the bill period',
};

/** A bill with its resolved split and recovery position. */
export interface BillAllocation {
  readonly bill: SharedBill;
  readonly agreement: AllocationAgreement | null;
  readonly shares: readonly BillShare[];
  /** Sum of shares charged to tenants. */
  readonly recovered: Money;
  /** The remainder the owner bears — an expense, not a recovery. */
  readonly ownerExpense: Money;
  /** Non-null when the split could not be applied. */
  readonly rejection: AllocationRejection | null;
}
