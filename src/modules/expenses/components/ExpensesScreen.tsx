'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Grid, Row, Stack, Stat, Sub, Toolbar } from '@/shared/components/Layout';
import { Timeline, type TimelineEntry } from '@/shared/components/Timeline';
import { useToast } from '@/shared/shell/ToastContext';
import { formatMoney, type Money } from '@/shared/lib/money';
import { formatDateShort } from '@/shared/lib/dates';
import { AMOUNT_BASIS_LABELS } from '@/shared/types/amounts';
import type { ExpenseView } from '../model';
import type { ExpenseFilter } from '../service';

const FILTER_OPTIONS: readonly { value: ExpenseFilter; label: string }[] = [
  { value: 'all', label: 'All expenses' },
  { value: 'corrected', label: 'Corrected' },
  { value: 'no-evidence', label: 'No evidence' },
  { value: 'estimated', label: 'Not actual' },
  { value: 'voided', label: 'Voided' },
];

export interface ExpensesScreenProps {
  readonly viewsByFilter: Record<ExpenseFilter, readonly ExpenseView[]>;
  readonly counts: Record<ExpenseFilter, number>;
  readonly total: Money;
  readonly byCategory: readonly {
    readonly category: string;
    readonly label: string;
    readonly total: Money;
    readonly count: number;
  }[];
  /** Names resolved server-side so this component stays presentational. */
  readonly propertyNames: Record<string, string>;
  readonly entityNames: Record<string, string>;
  readonly userNames: Record<string, string>;
}

/**
 * FR-04 — the expense register.
 *
 * A corrected expense shows its version count; selecting it reveals the full
 * revision history with who changed what, when and why.
 */
export function ExpensesScreen({
  viewsByFilter,
  counts,
  total,
  byCategory,
  propertyNames,
  entityNames,
  userNames,
}: ExpensesScreenProps) {
  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(viewsByFilter.all[0]?.expense.id ?? null);
  const { toast } = useToast();

  const rows = viewsByFilter[filter];
  const selected = [...viewsByFilter.all, ...viewsByFilter.voided].find(
    (view) => view.expense.id === selectedId,
  );

  const columns: readonly DataTableColumn<ExpenseView>[] = [
    {
      header: 'Expense',
      lead: true,
      render: (view) => (
        <>
          <CellMain>{view.current.description}</CellMain>
          <CellSub>
            {propertyNames[view.current.allocation.propertyId ?? ''] ??
              entityNames[view.current.allocation.entityId] ??
              '—'}
          </CellSub>
        </>
      ),
    },
    { header: 'Category', render: (view) => <Chip tone="neutral">{view.categoryLabel}</Chip> },
    { header: 'Effective', render: (view) => formatDateShort(view.current.effectiveOn) },
    {
      header: 'Amount',
      align: 'right',
      render: (view) => (
        <span className="num" style={view.isVoided ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
          {formatMoney(view.current.amount, { showCents: true })}
        </span>
      ),
    },
    {
      header: 'Basis',
      render: (view) =>
        view.current.basis === 'actual' ? (
          <Chip tone="neutral">Actual</Chip>
        ) : (
          <Chip tone="warn" icon="i-alert">
            {AMOUNT_BASIS_LABELS[view.current.basis]}
          </Chip>
        ),
    },
    { header: 'Source', render: (view) => view.sourceLabel },
    {
      header: 'Status',
      render: (view) => {
        if (view.isVoided) {
          return (
            <Chip tone="neutral" icon="i-x">
              Voided · retained
            </Chip>
          );
        }
        if (view.isCorrected) {
          return (
            <Chip tone="info" icon="i-clock">
              Corrected · v{view.versionCount}
            </Chip>
          );
        }
        return view.hasEvidence ? (
          <Chip tone="good" icon="i-check">
            Evidenced
          </Chip>
        ) : (
          <Chip tone="warn" icon="i-alert">
            No evidence
          </Chip>
        );
      },
    },
  ];

  return (
    <Stack>
      <Grid columns={2}>
        <Card>
          <CardHeader title="Expenses by category" aside={<Sub>Operating costs · voided records excluded</Sub>} />
          <CardBody>
            <div className="stack">
              {byCategory.map((row, index) => (
                <div key={row.category} style={index === 0 ? undefined : { marginTop: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                    <span>
                      {row.label} <span className="sub">· {row.count}</span>
                    </span>
                    <b className="num">{formatMoney(row.total, { showCents: true })}</b>
                  </div>
                  <div
                    style={{ height: 8, borderRadius: 4, background: 'var(--line-2)', marginTop: 6, overflow: 'hidden' }}
                  >
                    <i
                      style={{
                        display: 'block',
                        width: total.cents === 0 ? '0%' : `${(row.total.cents / total.cents) * 100}%`,
                        height: '100%',
                        background: 'var(--bar)',
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="sub" style={{ margin: '14px 0 0', fontSize: 12 }}>
                Total {formatMoney(total, { showCents: true })}. Every figure here traces to its allocated expenses and
                original evidence.
              </p>
            </div>
          </CardBody>
        </Card>

        {selected ? (
          <ExpenseDetail view={selected} userNames={userNames} propertyNames={propertyNames} entityNames={entityNames} />
        ) : null}
      </Grid>

      <Toolbar>
        <FilterGroup
          label="Filter expenses"
          options={FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            ...(counts[option.value] > 0 ? { count: counts[option.value] } : {}),
          }))}
          value={filter}
          onChange={setFilter}
        />
        <Button variant="primary" onClick={() => toast('New expense form is not wired up in this build')}>
          + Record expense
        </Button>
      </Toolbar>

      <Card>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(view) => view.expense.id}
          onRowClick={(view) => setSelectedId(view.expense.id)}
          isRowSelected={(view) => view.expense.id === selectedId}
          rowStyle={(view) => (view.expense.id === selectedId ? { background: 'var(--gold-soft)' } : undefined)}
          empty="No expenses match this filter."
        />
      </Card>

      <Sub style={{ fontSize: 12 }}>
        Corrections are versioned, never overwritten. Voiding removes an expense from totals but keeps the record and
        every earlier version — deletion does not erase audit history.
      </Sub>
    </Stack>
  );
}

function ExpenseDetail({
  view,
  userNames,
  propertyNames,
  entityNames,
}: {
  readonly view: ExpenseView;
  readonly userNames: Record<string, string>;
  readonly propertyNames: Record<string, string>;
  readonly entityNames: Record<string, string>;
}) {
  const { toast } = useToast();
  const { expense, current } = view;

  const entries: readonly TimelineEntry[] = [
    ...expense.revisions.map<TimelineEntry>((revision) => ({
      id: `v${revision.version}`,
      state: revision.version === current.version ? 'done' : 'pending',
      title: `v${revision.version} · ${formatMoney(revision.amount, { showCents: true })} · ${revision.description}`,
      meta: `${formatDateShort(revision.postedAt.slice(0, 10))} · ${
        userNames[revision.recordedBy] ?? 'Unknown'
      }${revision.correctionReason ? ` · ${revision.correctionReason}` : ''}`,
    })),
    ...(expense.voidedAt
      ? [
          {
            id: 'voided',
            state: 'fail' as const,
            title: 'Voided · excluded from totals, record retained',
            meta: `${formatDateShort(expense.voidedAt.slice(0, 10))} · ${
              userNames[expense.voidedBy ?? ''] ?? 'Unknown'
            } · ${expense.voidReason ?? ''}`,
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader
        title={current.description}
        aside={view.isVoided ? <Chip tone="neutral" icon="i-x">Voided</Chip> : <Chip tone="gold">Selected</Chip>}
      />
      <CardBody className="stack">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Stat label="Amount" value={<span className="num">{formatMoney(current.amount, { showCents: true })}</span>} />
          <Stat label="Category" value={view.categoryLabel} />
          <Stat
            label="Allocated to"
            value={propertyNames[current.allocation.propertyId ?? ''] ?? '—'}
            meta={entityNames[current.allocation.entityId]}
          />
          <Stat
            label="Effective / posted"
            value={formatDateShort(current.effectiveOn)}
            meta={`Entered ${formatDateShort(current.postedAt.slice(0, 10))}`}
          />
        </div>

        <div>
          <div className="sub" style={{ marginBottom: 8, fontWeight: 500, color: 'var(--text)' }}>
            Revision history
          </div>
          <Timeline entries={entries} />
        </div>

        <Row>
          <Button variant="gold" onClick={() => toast('Attach evidence is not wired up in this build')}>
            Attach evidence
          </Button>
          {!view.isVoided ? (
            <Button variant="ghost" onClick={() => toast('Voiding requires a reason; not wired up in this build')}>
              Void expense
            </Button>
          ) : null}
        </Row>
      </CardBody>
    </Card>
  );
}
