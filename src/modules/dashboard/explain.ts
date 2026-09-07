/**
 * Drill-down (FR-09).
 *
 * "Drill-down must explain every total." A headline figure the reader cannot
 * take apart is a figure they cannot trust, so every KPI resolves to the list of
 * records behind it, each line naming its own source.
 *
 * The contract this file keeps: **the lines always sum to the total.** The
 * explanation is derived from the same services that produce the figure, never
 * recomputed by a parallel path that could drift.
 */
import { money, sumMoney, type Money } from '@/shared/lib/money';
import { formatDateShort } from '@/shared/lib/dates';
import type { IsoDate } from '@/shared/types/common';
import { propertiesService } from '@/modules/properties/service';
import { entitiesService } from '@/modules/entities/service';
import { loansRepository } from '@/modules/loans/repository';
import { leasesService } from '@/modules/leases/service';
import { obligationsService } from '@/modules/obligations/service';
import { expensesService } from '@/modules/expenses/service';
import { dashboardService } from './service';

/** Every total a reader can drill into. */
export type ExplainableMetric =
  | 'net-worth'
  | 'assets'
  | 'liabilities'
  | 'arrears'
  | 'upcoming-obligations'
  | 'operating-expenses';

export const METRIC_LABELS: Record<ExplainableMetric, string> = {
  'net-worth': 'Net worth',
  assets: 'Assets (included interests)',
  liabilities: 'Liabilities',
  arrears: 'Rent arrears',
  'upcoming-obligations': 'Due in the next 14 days',
  'operating-expenses': 'Operating expenses',
};

/** One contributing record. */
export interface ExplanationLine {
  readonly id: string;
  readonly label: string;
  /** Where the figure came from — the audit trail in one line. */
  readonly source: string;
  readonly amount: Money;
  /** Set when the line reduces the total, so the UI can render it as a deduction. */
  readonly isDeduction?: boolean;
  /** A caveat the reader should see, e.g. a stale valuation. */
  readonly caveat?: string;
  /** Where to go to see the underlying record. */
  readonly href?: string;
}

export interface Explanation {
  readonly metric: ExplainableMetric;
  readonly label: string;
  readonly asOf: IsoDate;
  readonly total: Money;
  readonly lines: readonly ExplanationLine[];
  /** How the total is derived, in words. */
  readonly rule: string;
  /** True when the lines sum to the total — asserted, not assumed. */
  readonly reconciles: boolean;
}

function build(
  metric: ExplainableMetric,
  asOf: IsoDate,
  total: Money,
  lines: readonly ExplanationLine[],
  rule: string,
): Explanation {
  const summed = lines.reduce(
    (running, line) => running + (line.isDeduction ? -line.amount.cents : line.amount.cents),
    0,
  );
  return {
    metric,
    label: METRIC_LABELS[metric],
    asOf,
    total,
    lines,
    rule,
    reconciles: summed === total.cents,
  };
}

/** Property lines at the owner's share — the BR-02 view of assets. */
function propertyLines(asOf: IsoDate): ExplanationLine[] {
  const consolidated = new Set<string>(entitiesService.consolidatedEntityIds());

  return propertiesService.list().flatMap<ExplanationLine>((property) => {
    const status = propertiesService.valuationStatus(property.id, asOf);
    if (!status.valuation) return [];

    const share = entitiesService
      .ownersOf(property.id, asOf)
      .filter((claim) => consolidated.has(claim.ownerEntityId))
      .reduce((total, claim) => total + claim.share, 0);
    if (share === 0) return [];

    const scaled = Math.round(status.valuation.amount.cents * share);
    return [
      {
        id: `property-${property.id}`,
        label: `${property.name}${share < 1 ? ` · ${Math.round(share * 100)}% interest` : ''}`,
        source: `${status.label} · valued ${formatDateShort(status.valuation.valuedOn)}`,
        amount: money(scaled, status.valuation.amount.currency),
        ...(status.isStale ? { caveat: 'Valuation is stale and not eligible for ratios' } : {}),
        href: `/properties/${property.id}`,
      },
    ];
  });
}

function receivableLines(): ExplanationLine[] {
  return loansRepository.listReceivables().map<ExplanationLine>((loan) => ({
    id: `receivable-${loan.id}`,
    label: loan.facilityName,
    source: `Receivable · balance as at ${formatDateShort(loan.balanceAsOf)} (FR-11)`,
    amount: loan.balance,
    href: '/loans',
  }));
}

function liabilityLines(): ExplanationLine[] {
  return loansRepository.listLiabilities().map<ExplanationLine>((loan) => ({
    id: `liability-${loan.id}`,
    label: `${loan.lender} · ${loan.facilityName}`,
    source: `Statement balance as at ${formatDateShort(loan.balanceAsOf)} · secured by ${loan.security.label}`,
    amount: loan.balance,
    href: '/loans',
  }));
}

export const explainService = {
  /**
   * Explain a total.
   *
   * Each branch composes its lines from the same services that produce the
   * headline figure, so the explanation cannot disagree with the number it
   * explains — `reconciles` proves it on every call.
   */
  explain(metric: ExplainableMetric, asOf: IsoDate): Explanation {
    switch (metric) {
      case 'assets': {
        const lines = [...propertyLines(asOf), ...receivableLines()];
        return build(
          'assets',
          asOf,
          dashboardService.totalAssets(asOf),
          lines,
          'Each property is counted once at the share held by consolidated entities, plus money lent out as a receivable (BR-02, FR-11).',
        );
      }

      case 'liabilities':
        return build(
          'liabilities',
          asOf,
          dashboardService.totalLiabilities(),
          liabilityLines(),
          'Every facility owed by the portfolio, counted once. Receivables are assets and are excluded (FR-11).',
        );

      case 'net-worth': {
        const lines: ExplanationLine[] = [
          ...propertyLines(asOf),
          ...receivableLines(),
          ...liabilityLines().map((line) => ({ ...line, isDeduction: true })),
        ];
        return build(
          'net-worth',
          asOf,
          dashboardService.netWorth(asOf).netWorth,
          lines,
          'Included asset interests minus included liabilities at the as-of date (BR-01).',
        );
      }

      case 'arrears': {
        const positions = leasesService.listArrears(asOf);
        const lines = positions.map<ExplanationLine>((position) => ({
          id: `arrears-${position.leaseId}`,
          label: `${position.tenantName} · ${position.propertyLabel}`,
          source: `Charged ${formatMoneyPlain(position.due)}, received ${formatMoneyPlain(position.received)}${
            position.credits.cents !== 0 ? `, credits ${formatMoneyPlain(position.credits)}` : ''
          }${position.reversals.cents !== 0 ? `, reversals ${formatMoneyPlain(position.reversals)}` : ''}`,
          amount: position.outstanding,
          ...(position.disputed ? { caveat: 'Disputed — collection reminders are paused' } : {}),
          href: '/leases',
        }));
        return build(
          'arrears',
          asOf,
          sumMoney(positions.map((position) => position.outstanding)),
          lines,
          'Due charges less allocated receipts and approved credits, adjusted for reversals. Future rent is not arrears (BR-05).',
        );
      }

      case 'upcoming-obligations': {
        const upcoming = obligationsService.upcoming(asOf);
        const lines = upcoming.map<ExplanationLine>((view) => ({
          id: `obligation-${view.obligation.id}`,
          label: `${view.obligation.title} · ${view.obligation.contextLabel}`,
          source: `Due ${formatDateShort(view.obligation.dueOn)} · ${view.obligation.evidence.label}`,
          amount: view.obligation.amount ?? money(0),
          ...(view.ineligibility ? { caveat: 'Not eligible for reminders' } : {}),
          href: '/obligations',
        }));
        return build(
          'upcoming-obligations',
          asOf,
          obligationsService.upcomingSummary(asOf).total,
          lines,
          'Unpaid obligations falling due inside the reminder horizon. Payment evidence closes an obligation; a reminder does not (FR-03).',
        );
      }

      case 'operating-expenses': {
        const views = expensesService.query();
        const lines = views.map<ExplanationLine>((view) => ({
          id: `expense-${view.expense.id}`,
          label: view.current.description,
          source: `${view.sourceLabel} · effective ${formatDateShort(view.current.effectiveOn)}${
            view.isCorrected ? ` · corrected to v${view.versionCount}` : ''
          }`,
          amount: view.current.amount,
          ...(view.current.basis !== 'actual' ? { caveat: `Amount is ${view.current.basis}, not actual` } : {}),
          ...(!view.hasEvidence ? { caveat: 'No evidence attached' } : {}),
          href: '/expenses',
        }));
        return build(
          'operating-expenses',
          asOf,
          expensesService.total(),
          lines,
          'Expenses excluding voided records. Loan principal is a cash outflow, not an expense (BR-03).',
        );
      }
    }
  },

  /** Every metric a reader can drill into, for the dashboard's links. */
  metrics(): readonly ExplainableMetric[] {
    return Object.keys(METRIC_LABELS) as ExplainableMetric[];
  },
};

/** Plain money text for source lines, where a formatted symbol would add noise. */
function formatMoneyPlain(value: Money): string {
  return `$${(Math.abs(value.cents) / 100).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
}
