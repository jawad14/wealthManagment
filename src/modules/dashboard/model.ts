/**
 * Dashboard read model (FR-09, BR-01, BR-02, BR-03).
 *
 * This module owns no records of its own except portfolio snapshots. Everything
 * else is composed from the feature modules, which is why the dependency arrows
 * all point *into* this module and never out of it.
 */
import type { EntityId, IsoDate } from '@/shared/types/common';
import type { Money } from '@/shared/lib/money';

/**
 * A point-in-time record of portfolio totals, written when a period is closed.
 * Deltas on the dashboard compare today against the most recent snapshot rather
 * than recomputing history, so a restated valuation cannot silently rewrite a
 * previously reported movement.
 */
export interface PortfolioSnapshot {
  readonly id: string;
  readonly asOf: IsoDate;
  readonly netWorth: Money;
  readonly assets: Money;
  readonly liabilities: Money;
  /** Label used in the delta caption, e.g. "Jun 2026 snapshot". */
  readonly label: string;
}

/** Net worth and its two components at a point in time (BR-01). */
export interface NetWorthBreakdown {
  readonly asOf: IsoDate;
  /** Included asset interests: property value at ownership share, plus receivables. */
  readonly assets: Money;
  /** Included liabilities. Receivables are never netted in here (FR-11). */
  readonly liabilities: Money;
  readonly netWorth: Money;
  /** Movement against the most recent snapshot, when one exists. */
  readonly movement: SnapshotMovement | null;
  /** Properties whose newest valuation has aged out of the ratio window. */
  readonly staleValuationCount: number;
}

export interface SnapshotMovement {
  readonly snapshotLabel: string;
  readonly netWorthChangeRatio: number;
  readonly liabilitiesChange: Money;
}

/**
 * One consolidated owner's position (BR-02).
 *
 * Each asset is counted once, at the owning entity's share. A company's equity
 * is **not** added on top of the properties it owns — that would double-count.
 */
export interface OwnershipPosition {
  readonly entityId: EntityId;
  readonly entityName: string;
  readonly assets: Money;
  readonly liabilities: Money;
  readonly net: Money;
  /** Share of total net worth, 0–1, for the bar width. */
  readonly shareOfTotal: number;
}

/** An item on the "needs attention" strip. */
export interface AttentionItem {
  readonly id: string;
  readonly tone: 'warn' | 'bad' | 'info';
  readonly icon: 'i-clock' | 'i-wallet' | 'i-alert' | 'i-link';
  readonly title: string;
  readonly detail: string;
  readonly href: string;
}

/**
 * The three financial views BR-03 requires to be reported separately.
 *
 * Conflating them is the classic error this rule exists to prevent: loan
 * principal is real cash leaving the account but is not an expense, so a "profit"
 * figure that subtracts it understates performance, while a "cash flow" figure
 * that ignores it overstates available cash.
 */
export interface FinancialPosition {
  readonly periodFrom: IsoDate;
  readonly periodTo: IsoDate;
  /** Cash actually received and paid, including loan principal as an outflow. */
  readonly cashFlow: CashFlowResult;
  /** Income less operating expenses. Excludes principal; includes interest. */
  readonly operatingResult: OperatingResult;
  /**
   * Deliberately absent. Tax outcomes need professional validation before any
   * jurisdiction-specific rule is activated, so the platform records inputs and
   * declines to estimate.
   */
  readonly taxEstimate: null;
  readonly taxEstimateNote: string;
}

export interface CashFlowResult {
  readonly receipts: Money;
  readonly outgoings: Money;
  readonly net: Money;
  /** Part of `outgoings` that repaid principal — cash out, but not an expense. */
  readonly loanPrincipal: Money;
  /** Excluded from both sides: internal transfers and loan drawdowns. */
  readonly excludedTransfers: Money;
}

export interface OperatingResult {
  readonly income: Money;
  readonly operatingExpenses: Money;
  /** Interest is an expense; principal is not. */
  readonly interestExpense: Money;
  readonly net: Money;
  /** Non-cash items are not modelled in this release. */
  readonly depreciation: null;
}

/** One month of the cash-flow chart. */
export interface CashFlowPoint {
  readonly month: IsoDate;
  readonly label: string;
  readonly receipts: Money;
  readonly outgoings: Money;
}
