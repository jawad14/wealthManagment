import Link from 'next/link';
import { Chip } from '@/shared/components/Chip';
import { Delta, Kpi, KpiGrid } from '@/shared/components/Kpi';
import { formatMoney, formatPercent } from '@/shared/lib/money';
import { formatDateShort } from '@/shared/lib/dates';
import { UPCOMING_WINDOW_DAYS } from '@/shared/config/app-config';
import type { NetWorthBreakdown } from '../model';
import type { Money } from '@/shared/lib/money';

export interface DashboardKpisProps {
  readonly netWorth: NetWorthBreakdown;
  readonly monthlyCash: {
    readonly monthLabel: string;
    readonly receipts: Money;
    readonly outgoings: Money;
    readonly loanPrincipal: Money;
    readonly receiptsChangeRatio: number | null;
    readonly outgoingsChangeRatio: number | null;
    readonly priorMonthLabel: string | null;
  } | null;
  readonly arrears: { readonly total: Money; readonly tenantCount: number; readonly disputedCount: number };
  readonly upcoming: { readonly total: Money; readonly count: number; readonly withoutOwner: number };
}

/** Direction for a delta pill, treating a negligible change as flat. */
function directionOf(ratio: number | null): 'up' | 'down' | 'flat' {
  if (ratio === null || Math.abs(ratio) < 0.0005) return 'flat';
  return ratio > 0 ? 'up' : 'down';
}

/**
 * The dashboard KPI row (FR-09).
 *
 * One hero tile only: net worth carries the charcoal fill, everything else stays
 * quiet so the eye lands in a single place.
 */
export function DashboardKpis({ netWorth, monthlyCash, arrears, upcoming }: DashboardKpisProps) {
  const movement = netWorth.movement;

  return (
    <KpiGrid>
      <Kpi
        accent
        wide
        label="Net worth"
        help="Included asset interests minus included liabilities at the as-of date (BR-01)"
        value={formatMoney(netWorth.netWorth)}
        valueSuffix={`as of ${formatDateShort(netWorth.asOf)}`}
        footer={
          movement ? (
            <>
              <Delta direction={directionOf(movement.netWorthChangeRatio)}>
                {formatPercent(Math.abs(movement.netWorthChangeRatio))}
              </Delta>
              vs {movement.snapshotLabel}
              <Link className="kpi-link" href="/explain/net-worth">
                Explain this total
              </Link>
            </>
          ) : (
            <Link className="kpi-link" href="/explain/net-worth">
              Explain this total
            </Link>
          )
        }
      />

      <Kpi
        label={<Link className="kpi-link" href="/explain/assets">Assets (included interests)</Link>}
        value={formatMoney(netWorth.assets)}
        footer={
          netWorth.staleValuationCount > 0 ? (
            <Chip tone="warn" icon="i-alert">
              {netWorth.staleValuationCount} stale valuation{netWorth.staleValuationCount === 1 ? '' : 's'}
            </Chip>
          ) : (
            <Chip tone="good" icon="i-check">
              All valuations current
            </Chip>
          )
        }
      />

      <Kpi
        label={<Link className="kpi-link" href="/explain/liabilities">Liabilities</Link>}
        value={formatMoney(netWorth.liabilities)}
        footer={
          movement ? (
            <>
              <Delta direction={movement.liabilitiesChange.cents <= 0 ? 'down' : 'up'}>
                {formatMoney({ ...movement.liabilitiesChange, cents: Math.abs(movement.liabilitiesChange.cents) })}
              </Delta>
              {movement.liabilitiesChange.cents <= 0 ? 'principal paid' : 'increase'} since{' '}
              {movement.snapshotLabel.split(' ')[0]}
            </>
          ) : null
        }
      />

      {monthlyCash ? (
        <Kpi
          label={`Rent received · ${monthlyCash.monthLabel}`}
          value={formatMoney(monthlyCash.receipts)}
          footer={
            <>
              <Delta direction={directionOf(monthlyCash.receiptsChangeRatio)}>
                {formatPercent(Math.abs(monthlyCash.receiptsChangeRatio ?? 0))}
              </Delta>
              vs {monthlyCash.priorMonthLabel ?? 'prior month'} · cash basis
            </>
          }
        />
      ) : null}

      {monthlyCash ? (
        <Kpi
          label={`Cash outgoings · ${monthlyCash.monthLabel}`}
          value={formatMoney(monthlyCash.outgoings)}
          footer={
            <>
              <Delta direction={directionOf(monthlyCash.outgoingsChangeRatio)}>
                {monthlyCash.outgoingsChangeRatio === null || directionOf(monthlyCash.outgoingsChangeRatio) === 'flat'
                  ? null
                  : formatPercent(Math.abs(monthlyCash.outgoingsChangeRatio))}
              </Delta>
              incl. {formatMoney(monthlyCash.loanPrincipal)} loan principal
            </>
          }
        />
      ) : null}

      <Kpi
        label={<Link className="kpi-link" href="/explain/arrears">Rent arrears</Link>}
        value={formatMoney(arrears.total)}
        valueStyle={arrears.total.cents > 0 ? { color: 'var(--bad)' } : undefined}
        footer={
          <>
            {arrears.tenantCount} tenant{arrears.tenantCount === 1 ? '' : 's'}
            {arrears.disputedCount > 0 ? ` · ${arrears.disputedCount} disputed` : ''}
          </>
        }
      />

      <Kpi
        label={
          <Link className="kpi-link" href="/explain/upcoming-obligations">
            Due in next {UPCOMING_WINDOW_DAYS} days
          </Link>
        }
        value={formatMoney(upcoming.total)}
        valueSuffix={`${upcoming.count} item${upcoming.count === 1 ? '' : 's'}`}
        footer={
          upcoming.withoutOwner > 0 ? (
            <Chip tone="warn" icon="i-alert">
              {upcoming.withoutOwner} without owner
            </Chip>
          ) : (
            <Chip tone="good" icon="i-check">
              All items owned
            </Chip>
          )
        }
      />
    </KpiGrid>
  );
}
