/**
 * Expense records (FR-04).
 *
 * The half of FR-04 that is not document storage: "Expenses shall retain
 * transaction date, amount, currency, category, entity, allocation and source.
 * Corrections shall be versioned; deletion must not erase audit history."
 *
 * Three consequences shape this model:
 *
 *  1. **A correction is a new version, not an overwrite.** `revisions` is
 *     append-only, so "who changed what and when" is answerable by construction.
 *  2. **Every expense names its source.** A figure from a bank statement, a
 *     shared-bill share and a hand-typed estimate carry different authority, and
 *     the record says which it is (BR-06).
 *  3. **Allocation is explicit.** An expense points at the property, lease or
 *     obligation it belongs to, which is what makes drill-down from a report
 *     total back to evidence possible (FR-09).
 */
import type {
  DocumentId,
  EntityId,
  IsoDate,
  IsoDateTime,
  LeaseId,
  ObligationId,
  PropertyId,
  UserId,
} from '@/shared/types/common';
import type { AmountBasis } from '@/shared/types/amounts';
import type { Money } from '@/shared/lib/money';

export type ExpenseCategory =
  | 'insurance'
  | 'rates'
  | 'utilities'
  | 'repairs'
  | 'management'
  | 'body-corporate'
  | 'compliance'
  | 'loan-interest'
  | 'professional'
  | 'other';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  insurance: 'Insurance',
  rates: 'Council rates',
  utilities: 'Utilities',
  repairs: 'Repairs & maintenance',
  management: 'Management fees',
  'body-corporate': 'Body corporate',
  compliance: 'Compliance',
  'loan-interest': 'Loan interest',
  professional: 'Professional fees',
  other: 'Other',
};

/** Where the expense came from — determines how much authority the figure carries. */
export type ExpenseSource =
  | { readonly kind: 'bank-transaction'; readonly transactionId: string }
  | { readonly kind: 'shared-bill'; readonly billId: string; readonly shareId: string }
  | { readonly kind: 'obligation'; readonly obligationId: ObligationId }
  | { readonly kind: 'manual'; readonly enteredBy: UserId };

export const EXPENSE_SOURCE_LABELS: Record<ExpenseSource['kind'], string> = {
  'bank-transaction': 'Bank transaction',
  'shared-bill': 'Shared bill share',
  obligation: 'Obligation',
  manual: 'Manual entry',
};

/** What the expense is charged against. Drives drill-down and per-property reporting. */
export interface ExpenseAllocation {
  readonly entityId: EntityId;
  readonly propertyId?: PropertyId;
  readonly leaseId?: LeaseId;
  readonly obligationId?: ObligationId;
}

/**
 * One version of an expense's mutable values.
 *
 * The current state is the last revision. Earlier revisions are never removed,
 * so a report can be reproduced as it stood at any point.
 */
export interface ExpenseRevision {
  readonly version: number;
  readonly amount: Money;
  readonly category: ExpenseCategory;
  /** BR-06: the period the cost belongs to. */
  readonly effectiveOn: IsoDate;
  readonly allocation: ExpenseAllocation;
  readonly basis: AmountBasis;
  readonly description: string;
  /** BR-06: when the system learned this version. */
  readonly postedAt: IsoDateTime;
  readonly recordedBy: UserId;
  /** Why the correction was made. Required for versions after the first. */
  readonly correctionReason?: string;
}

export interface Expense {
  readonly id: string;
  readonly source: ExpenseSource;
  /** Append-only. The last entry is current. */
  readonly revisions: readonly ExpenseRevision[];
  /** Evidence backing the expense — invoice, receipt or statement page. */
  readonly evidenceDocumentIds: readonly DocumentId[];
  /**
   * Set when the expense is withdrawn. The record and every revision stay in
   * place; only its inclusion in totals changes. Deletion never erases history.
   */
  readonly voidedAt?: IsoDateTime;
  readonly voidedBy?: UserId;
  readonly voidReason?: string;
}

/** The current state of an expense — the last revision, flattened for reading. */
export interface ExpenseView {
  readonly expense: Expense;
  readonly current: ExpenseRevision;
  readonly categoryLabel: string;
  readonly sourceLabel: string;
  readonly versionCount: number;
  readonly isCorrected: boolean;
  readonly isVoided: boolean;
  readonly hasEvidence: boolean;
}

export function currentRevision(expense: Expense): ExpenseRevision {
  const latest = expense.revisions[expense.revisions.length - 1];
  if (!latest) throw new Error(`Expense ${expense.id} has no revisions; this should be impossible.`);
  return latest;
}

/** Voided expenses are excluded from every total but remain readable. */
export function isIncludedInTotals(expense: Expense): boolean {
  return expense.voidedAt === undefined;
}
