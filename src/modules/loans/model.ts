/**
 * Loans & liabilities domain model (FR-03, FR-11, BR-04).
 *
 * Two things this model is careful about:
 *  1. A facility has a **direction**. Money lent out is a receivable — an asset —
 *     and must never be added to debt or treated as an expense (FR-11).
 *  2. Security can be a **pool**. A cross-collateralised facility is secured by
 *     several properties at once, so per-property debt and LVR cannot be derived
 *     without an explicit allocation policy (BR-04).
 */
import type { EntityId, IsoDate, LoanId, PropertyId } from '@/shared/types/common';
import type { Money } from '@/shared/lib/money';

/** `liability` = money owed by the portfolio. `receivable` = money owed to it. */
export type LoanDirection = 'liability' | 'receivable';

export type RateType = 'fixed' | 'variable';

export interface InterestRate {
  /** Annual nominal rate as a fraction, e.g. 0.0589 for 5.89%. */
  readonly annual: number;
  readonly type: RateType;
  /** Set for fixed facilities — drives the "next rate review" KPI. */
  readonly fixedUntil?: IsoDate;
}

export type RepaymentType = 'P&I' | 'IO' | 'custom';

/**
 * Repayment components as recorded from the lender's statement.
 *
 * These are stored rather than derived: the split the lender applies depends on
 * the facility's own amortisation, and reconstructing it from a rate and balance
 * produces figures that disagree with the statement.
 */
export interface Repayment {
  readonly type: RepaymentType;
  readonly monthly: Money;
  readonly principalComponent: Money;
  readonly interestComponent: Money;
}

/**
 * How a facility is secured.
 * - `single`    — one property; per-property LVR is computable.
 * - `pool`      — several properties; needs an allocation policy before any
 *                 per-property figure can be published.
 * - `unsecured` — no collateral.
 */
export type SecurityKind = 'single' | 'pool' | 'unsecured';

export interface LoanSecurity {
  readonly kind: SecurityKind;
  readonly propertyIds: readonly PropertyId[];
  /** Display label, e.g. "Compton Rd + Benton St". */
  readonly label: string;
}

/**
 * How pooled debt is attributed to individual properties.
 * `approved` gates publication: an unapproved policy may inform a working figure
 * but must not drive a headline ratio.
 */
export interface DebtAllocationPolicy {
  readonly kind: 'equal-split' | 'by-valuation' | 'manual';
  readonly approved: boolean;
  readonly note: string;
}

export interface Loan {
  readonly id: LoanId;
  readonly lender: string;
  /** e.g. "Home loan 4417". */
  readonly facilityName: string;
  /** Secondary line under the facility name, e.g. "Cross-collateralised". */
  readonly facilityNote?: string;
  readonly direction: LoanDirection;
  /** Display label for the borrower (or lender, for receivables). */
  readonly counterpartyLabel: string;
  readonly borrowerEntityIds: readonly EntityId[];
  /** Always a positive magnitude; `direction` carries the sign meaning. */
  readonly balance: Money;
  readonly balanceAsOf: IsoDate;
  readonly rate: InterestRate;
  readonly repayment: Repayment;
  readonly security: LoanSecurity;
  readonly allocationPolicy?: DebtAllocationPolicy;
  /** Scheduled review date shown in the "Next rate review" KPI. */
  readonly rateReviewOn?: IsoDate;
}

/** Reason a ratio could not be produced — rendered instead of a misleading zero. */
export type RatioUnavailableReason =
  | 'no-valuation'
  | 'stale-valuation'
  | 'pool-without-policy'
  | 'not-secured';

export const RATIO_UNAVAILABLE_LABELS: Record<RatioUnavailableReason, string> = {
  'no-valuation': 'Unavailable · valuation missing',
  'stale-valuation': 'Unavailable · valuation stale',
  'pool-without-policy': 'Pool only · allocation policy needed',
  'not-secured': '—',
};
