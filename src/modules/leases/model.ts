/**
 * Leases & tenants domain model (FR-05, BR-05).
 *
 * Arrears are never stored. They are always derived as
 * `charges due on or before the as-of date − receipts allocated to those charges`
 * so the figure can be explained down to the individual charge and receipt.
 */
import type {
  IsoDate,
  LeaseId,
  PropertyComponentId,
  PropertyId,
  RentChargeId,
  TenantId,
  UserId,
} from '@/shared/types/common';
import type { Money } from '@/shared/lib/money';

export type RentFrequency = 'weekly' | 'fortnightly' | 'monthly';

export const FREQUENCY_LABELS: Record<RentFrequency, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
};

/** Charge periods per year — the basis for annualising and monthly equivalents. */
export const PERIODS_PER_YEAR: Record<RentFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
};

/** Short suffix used in tables: "$1,380 / fortnight". */
export const FREQUENCY_SUFFIX: Record<RentFrequency, string> = {
  weekly: 'week',
  fortnightly: 'fortnight',
  monthly: 'month',
};

export interface Tenant {
  readonly id: TenantId;
  /** Display name as it appears in tables, e.g. "A. Nguyen". */
  readonly name: string;
}

export type LeaseStatus = 'active' | 'ending-soon' | 'disputed' | 'ended';

export interface Lease {
  readonly id: LeaseId;
  readonly tenantId: TenantId;
  readonly propertyId: PropertyId;
  /** Null for whole-property leases that predate component modelling. */
  readonly componentId: PropertyComponentId | null;
  /**
   * Billing reference the tenant quotes on transfers. This is what makes bank
   * receipts auto-match to the right lease.
   */
  readonly reference: string;
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate;
  readonly rent: Money;
  readonly frequency: RentFrequency;
  /**
   * First charge date. Kept separate from `startsOn` because the rent day is
   * often not the lease commencement day.
   */
  readonly chargeAnchorOn: IsoDate;
  readonly bond?: Money;
  readonly remindersEnabled: boolean;
  /**
   * A disputed lease pauses automated charging reminders. Charges still accrue —
   * pausing reminders is a communication decision, not an accounting one.
   */
  readonly disputed: boolean;
}

export interface RentCharge {
  readonly id: RentChargeId;
  readonly leaseId: LeaseId;
  readonly dueOn: IsoDate;
  readonly amount: Money;
}

/**
 * What an allocation represents (FR-06, BR-05).
 *
 * - `receipt`  — money received from the tenant.
 * - `credit`   — an approved reduction (goodwill, agreed adjustment). Requires
 *                an approver, because a credit forgives real money.
 * - `reversal` — undoes an earlier allocation, e.g. a dishonoured payment.
 *                Carries a negative amount and names what it reverses.
 */
export type AllocationKind = 'receipt' | 'credit' | 'reversal';

export const ALLOCATION_KIND_LABELS: Record<AllocationKind, string> = {
  receipt: 'Receipt',
  credit: 'Approved credit',
  reversal: 'Reversal',
};

/**
 * A receipt applied to a charge. Kept separate from the charge so a single bank
 * receipt can be split across charges and a charge can be part-paid many times.
 *
 * Reversals and credits are stored as further allocations rather than by editing
 * or deleting the original, so the payment history stays a complete, additive
 * record — a dishonoured payment shows as a receipt followed by its reversal.
 */
export interface RentAllocation {
  readonly id: string;
  readonly chargeId: RentChargeId;
  readonly kind: AllocationKind;
  /** Negative for reversals; positive for receipts and credits. */
  readonly amount: Money;
  readonly receivedOn: IsoDate;
  /** The staged bank transaction this allocation came from, when matched. */
  readonly bankTransactionId?: string;
  /** For a reversal: the allocation it undoes. */
  readonly reversesAllocationId?: string;
  /** A credit is only valid once approved — it forgives money that was owed. */
  readonly approvedBy?: UserId;
  readonly note?: string;
}

/** Per-lease arrears position at a point in time (BR-05). */
export interface ArrearsPosition {
  readonly leaseId: LeaseId;
  readonly tenantName: string;
  readonly propertyLabel: string;
  readonly due: Money;
  /** Cash actually received. */
  readonly received: Money;
  /** Approved credits applied against the charges. */
  readonly credits: Money;
  /** Reversals applied — a dishonoured payment restores the amount owing. */
  readonly reversals: Money;
  /** Positive = owing, negative = paid ahead. */
  readonly outstanding: Money;
  /** Days since the oldest unpaid charge fell due; null when nothing is owing. */
  readonly daysOverdue: number | null;
  readonly disputed: boolean;
  readonly state: ArrearsState;
}

export type ArrearsState = 'clear' | 'paid-ahead' | 'partial' | 'overdue' | 'disputed';
