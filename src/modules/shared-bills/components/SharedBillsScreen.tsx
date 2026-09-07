'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Kpi, KpiGrid } from '@/shared/components/Kpi';
import { Grid, Row, Stack, Stat, Sub, Toolbar } from '@/shared/components/Layout';
import { useToast } from '@/shared/shell/ToastContext';
import { formatMoney, type Money } from '@/shared/lib/money';
import { formatDateShort } from '@/shared/lib/dates';
import {
  ALLOCATION_BASIS_LABELS,
  ALLOCATION_REJECTION_LABELS,
  SHARED_BILL_CATEGORY_LABELS,
  type BillAllocation,
} from '../model';
import type { SharedBillFilter } from '../service';

const FILTER_OPTIONS: readonly { value: SharedBillFilter; label: string }[] = [
  { value: 'all', label: 'All bills' },
  { value: 'recoverable', label: 'Recoverable' },
  { value: 'owner-cost', label: 'Owner cost' },
  { value: 'needs-review', label: 'Needs review' },
  { value: 'blocked', label: 'Blocked' },
];

export interface SharedBillsScreenProps {
  readonly allocationsByFilter: Record<SharedBillFilter, readonly BillAllocation[]>;
  readonly counts: Record<SharedBillFilter, number>;
  readonly totalRecovered: Money;
  readonly totalOwnerExpense: Money;
  /** Property names resolved on the server, keyed by property id. */
  readonly propertyNames: Record<string, string>;
}

/**
 * FR-07 — shared bills and recoveries.
 *
 * The table makes the split visible per bill, and the detail panel shows each
 * share with the agreement authorising it. A bill the platform cannot split
 * shows why, rather than a guessed allocation.
 */
export function SharedBillsScreen({
  allocationsByFilter,
  counts,
  totalRecovered,
  totalOwnerExpense,
  propertyNames,
}: SharedBillsScreenProps) {
  const [filter, setFilter] = useState<SharedBillFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(
    allocationsByFilter.all[0]?.bill.id ?? null,
  );
  const { toast } = useToast();

  const rows = allocationsByFilter[filter];
  const selected = allocationsByFilter.all.find((entry) => entry.bill.id === selectedId) ?? null;

  const columns: readonly DataTableColumn<BillAllocation>[] = [
    {
      header: 'Bill',
      lead: true,
      render: (row) => (
        <>
          <CellMain>
            {SHARED_BILL_CATEGORY_LABELS[row.bill.category]} · {row.bill.supplier}
            {row.bill.reference ? ` ${row.bill.reference}` : ''}
          </CellMain>
          <CellSub>{propertyNames[row.bill.propertyId] ?? 'Unknown property'}</CellSub>
        </>
      ),
    },
    {
      header: 'Period',
      render: (row) => `${formatDateShort(row.bill.periodFrom)} – ${formatDateShort(row.bill.periodTo)}`,
    },
    {
      header: 'Total',
      align: 'right',
      render: (row) => <span className="num">{formatMoney(row.bill.total, { showCents: true })}</span>,
    },
    {
      header: 'Split',
      render: (row) =>
        row.rejection ? (
          <Chip tone="warn" icon="i-alert">
            Not split
          </Chip>
        ) : (
          <>
            {row.agreement?.description}
            <CellSub>{row.agreement ? ALLOCATION_BASIS_LABELS[row.agreement.basis] : ''}</CellSub>
          </>
        ),
    },
    {
      header: 'Recovered',
      align: 'right',
      render: (row) => (
        <span className="num" style={row.recovered.cents > 0 ? { color: 'var(--good)' } : undefined}>
          {formatMoney(row.recovered, { showCents: true })}
        </span>
      ),
    },
    {
      header: 'Owner cost',
      align: 'right',
      render: (row) => <span className="num">{formatMoney(row.ownerExpense, { showCents: true })}</span>,
    },
    {
      header: 'Review',
      render: (row) =>
        row.bill.recoveryReviewedOn ? (
          <Chip tone="good" icon="i-check">
            Reviewed {formatDateShort(row.bill.recoveryReviewedOn)}
          </Chip>
        ) : (
          <Chip tone="warn" icon="i-alert">
            Not reviewed
          </Chip>
        ),
    },
  ];

  return (
    <Stack>
      <KpiGrid>
        <Kpi
          accent
          wide
          label="Recovered from tenants"
          help="Shares charged to active leases. A recovered amount is a tenant charge, never an owner expense (FR-07)."
          value={formatMoney(totalRecovered)}
          footer={`${counts.recoverable} of ${counts.all} bills have a recoverable share`}
        />
        <Kpi
          label="Owner cost (unrecovered)"
          value={formatMoney(totalOwnerExpense)}
          footer="Counted once in expenses"
        />
        <Kpi
          label="Awaiting recovery review"
          value={counts['needs-review']}
          footer={
            counts.blocked > 0 ? (
              <Chip tone="warn" icon="i-alert">
                {counts.blocked} blocked on agreement
              </Chip>
            ) : (
              'Recoverability is a reviewed input'
            )
          }
        />
      </KpiGrid>

      <Toolbar>
        <FilterGroup
          label="Filter shared bills"
          options={FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            ...(counts[option.value] > 0 ? { count: counts[option.value] } : {}),
          }))}
          value={filter}
          onChange={setFilter}
        />
        <Button variant="primary" onClick={() => toast('New shared bill form is not wired up in this build')}>
          + Add shared bill
        </Button>
      </Toolbar>

      <Grid columns={2}>
        <Card>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.bill.id}
            onRowClick={(row) => setSelectedId(row.bill.id)}
            isRowSelected={(row) => row.bill.id === selectedId}
            rowStyle={(row) => (row.bill.id === selectedId ? { background: 'var(--gold-soft)' } : undefined)}
            empty="No shared bills match this filter."
          />
        </Card>

        {selected ? <BillDetail allocation={selected} propertyNames={propertyNames} /> : null}
      </Grid>

      <Sub style={{ fontSize: 12 }}>
        Shares are recomputed from the bill total every time, so they always add up to the cent. Recoverability and any
        deadline are recorded from your review — the platform never infers them.
      </Sub>
    </Stack>
  );
}

function BillDetail({
  allocation,
  propertyNames,
}: {
  readonly allocation: BillAllocation;
  readonly propertyNames: Record<string, string>;
}) {
  const { toast } = useToast();
  const { bill, agreement, shares, rejection } = allocation;

  return (
    <Card>
      <CardHeader
        title={`${SHARED_BILL_CATEGORY_LABELS[bill.category]} · ${bill.supplier}`}
        aside={
          rejection ? (
            <Chip tone="warn" icon="i-alert">
              Blocked
            </Chip>
          ) : (
            <Chip tone="gold">Selected</Chip>
          )
        }
      />
      <CardBody className="stack">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Stat label="Bill total" value={<span className="num">{formatMoney(bill.total, { showCents: true })}</span>} />
          <Stat label="Due" value={formatDateShort(bill.dueOn)} />
          <Stat label="Property" value={propertyNames[bill.propertyId] ?? '—'} />
          <Stat
            label="Effective / posted"
            value={formatDateShort(bill.effectiveOn)}
            meta={`Entered ${formatDateShort(bill.postedAt.slice(0, 10))}`}
          />
        </div>

        {rejection ? (
          <div className="banner warn">
            <svg className="i">
              <use href="#i-alert" />
            </svg>
            <div>
              <b>This bill has not been split</b>
              <p>{ALLOCATION_REJECTION_LABELS[rejection]}. The full amount is treated as an owner cost until resolved.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="sub" style={{ marginBottom: 8, fontWeight: 500, color: 'var(--text)' }}>
              Allocation · {agreement?.description}
            </div>
            <ul className="list">
              {shares.map((share) => (
                <li key={share.id}>
                  <div className="li-main">
                    <b>{share.label}</b>
                    <span>
                      {agreement?.basis === 'percentage' ? `${share.weight}%` : ALLOCATION_BASIS_LABELS[agreement?.basis ?? 'equal']}
                      {share.recoverable ? ' · recoverable from tenant' : ' · owner cost'}
                    </span>
                  </div>
                  <div className="li-amt num">{formatMoney(share.amount, { showCents: true })}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Row>
          <Button variant="gold" onClick={() => toast('Recovery review is not wired up in this build')}>
            Record recovery review
          </Button>
          <Button onClick={() => toast('Agreement editing is not wired up in this build')}>View agreement</Button>
        </Row>
      </CardBody>
    </Card>
  );
}
