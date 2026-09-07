import { Card, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { Kpi, KpiGrid } from '@/shared/components/Kpi';
import { Stack, Sub } from '@/shared/components/Layout';
import { formatMoney, formatPercent } from '@/shared/lib/money';
import { formatDateCompact, formatDateShort } from '@/shared/lib/dates';
import type { Available } from '@/shared/lib/result';
import type { Money } from '@/shared/lib/money';
import { RATIO_UNAVAILABLE_LABELS, type Loan, type RatioUnavailableReason } from '../model';

export interface LoanRow {
  readonly loan: Loan;
  readonly lvr: Available<number>;
  readonly lvrReason: RatioUnavailableReason | null;
}

export interface LoansScreenProps {
  readonly rows: readonly LoanRow[];
  readonly totalDebt: Money;
  readonly facilityCount: number;
  readonly portfolioLvr: Available<number>;
  readonly collateralRangeLabel: string | null;
  readonly repayments: { readonly total: Money; readonly principal: Money; readonly interest: Money };
  readonly nextReview: { readonly on: string; readonly detail: string } | null;
}

/** Renders an LVR cell, or the reason it cannot be produced (BR-04). */
function LvrCell({ row }: { readonly row: LoanRow }) {
  if (row.lvr.available) return <span className="num">{formatPercent(row.lvr.value)}</span>;
  if (row.lvrReason === 'not-secured') return <>—</>;
  const label = row.lvrReason ? RATIO_UNAVAILABLE_LABELS[row.lvrReason] : 'Unavailable';
  return row.lvrReason === 'pool-without-policy' ? (
    <Chip tone="warn" icon="i-alert">
      {label}
    </Chip>
  ) : (
    <Chip tone="neutral">{label}</Chip>
  );
}

const columns: readonly DataTableColumn<LoanRow>[] = [
  {
    header: 'Lender · facility',
    mobileLabel: 'Facility',
    lead: true,
    render: ({ loan }) => (
      <>
        <CellMain>
          {loan.direction === 'receivable' ? loan.facilityName : `${loan.lender} · ${loan.facilityName}`}
        </CellMain>
        {loan.facilityNote ? <CellSub>{loan.facilityNote}</CellSub> : null}
      </>
    ),
  },
  { header: 'Borrower', render: ({ loan }) => loan.counterpartyLabel },
  {
    header: 'Balance',
    align: 'right',
    render: ({ loan }) => (
      <span className="num" style={loan.direction === 'receivable' ? { color: 'var(--good)' } : undefined}>
        {loan.direction === 'receivable' ? `+${formatMoney(loan.balance)}` : formatMoney(loan.balance)}
      </span>
    ),
  },
  { header: 'As of', render: ({ loan }) => formatDateCompact(loan.balanceAsOf) },
  {
    header: 'Rate',
    align: 'right',
    render: ({ loan }) => (
      <span className="num">
        {(loan.rate.annual * 100).toFixed(2)}%{loan.rate.type === 'fixed' ? ' fixed' : ' var'}
      </span>
    ),
  },
  {
    header: 'Repayment',
    render: ({ loan }) =>
      `${loan.repayment.type === 'custom' ? '' : `${loan.repayment.type} · `}${formatMoney(
        loan.repayment.monthly,
      )}/m`,
  },
  { header: 'Secured by', render: ({ loan }) => loan.security.label },
  { header: 'Property LVR', mobileLabel: 'LVR', align: 'right', render: (row) => <LvrCell row={row} /> },
];

/** FR-03, BR-04, FR-11 — facilities and liability ratios. */
export function LoansScreen({
  rows,
  totalDebt,
  facilityCount,
  portfolioLvr,
  collateralRangeLabel,
  repayments,
  nextReview,
}: LoansScreenProps) {
  return (
    <Stack>
      <KpiGrid>
        <Kpi
          accent
          label="Total debt"
          value={formatMoney(totalDebt)}
          footer={`${facilityCount} liabilit${facilityCount === 1 ? 'y' : 'ies'} · counted once each`}
        />
        <Kpi
          label="Portfolio LVR (collateral pool)"
          value={portfolioLvr.available ? (portfolioLvr.value * 100).toFixed(1) : 'Unavailable'}
          valueSuffix={portfolioLvr.available ? '%' : undefined}
          footer={
            portfolioLvr.available
              ? `Debt ÷ eligible collateral${collateralRangeLabel ? ` · valuations ${collateralRangeLabel}` : ''}`
              : `Debt ÷ eligible collateral · ${portfolioLvr.reason}`
          }
        />
        <Kpi
          label="Monthly repayments"
          value={formatMoney(repayments.total)}
          footer={`${formatMoney(repayments.principal)} principal · ${formatMoney(repayments.interest)} interest`}
        />
        <Kpi
          label="Next rate review"
          value={nextReview ? formatDateShort(nextReview.on) : 'None scheduled'}
          footer={nextReview?.detail ?? 'No fixed terms ending'}
        />
      </KpiGrid>

      <Card>
        <CardHeader title="Facilities" aside={<Sub>Balances as of last statement date</Sub>} />
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.loan.id} empty="No facilities recorded." />
      </Card>

      <Sub style={{ fontSize: 12 }}>
        Money lent out is shown as a receivable and is never counted as debt or as an expense (FR-11).
      </Sub>
    </Stack>
  );
}
