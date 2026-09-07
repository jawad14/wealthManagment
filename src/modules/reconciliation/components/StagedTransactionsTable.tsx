'use client';

import { Card, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { Button } from '@/shared/components/Button';
import { Confidence } from '@/shared/components/Confidence';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { Row } from '@/shared/components/Layout';
import { formatMoney } from '@/shared/lib/money';
import { formatDateShort } from '@/shared/lib/dates';
import type { StagedTransaction } from '../model';

export interface StagedTransactionsTableProps {
  readonly rows: readonly StagedTransaction[];
  readonly highConfidenceCount: number;
  readonly onConfirm: (transaction: StagedTransaction) => void;
  readonly onChange: (transaction: StagedTransaction) => void;
  readonly onConfirmAll: () => void;
}

/**
 * Staged rows awaiting confirmation.
 *
 * Every machine suggestion carries a confidence bar and a Confirm button;
 * confirmed rows show neither. That is the visual contract that keeps a
 * suggestion from being mistaken for a posted fact.
 */
export function StagedTransactionsTable({
  rows,
  highConfidenceCount,
  onConfirm,
  onChange,
  onConfirmAll,
}: StagedTransactionsTableProps) {
  const columns: readonly DataTableColumn<StagedTransaction>[] = [
    { header: 'Date', render: (row) => formatDateShort(row.date) },
    {
      header: 'Bank description',
      mobileLabel: 'Description',
      lead: true,
      render: (row) => (
        <>
          <CellMain>{row.rawDescription}</CellMain>
          {row.rawReference ? <CellSub>{row.rawReference}</CellSub> : null}
        </>
      ),
    },
    {
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="num" style={row.amount.cents > 0 ? { color: 'var(--good)' } : undefined}>
          {formatMoney(row.amount, { showCents: true, signed: true })}
        </span>
      ),
    },
    {
      header: 'Suggested allocation',
      mobileLabel: 'Allocation',
      render: (row) =>
        row.suggestion ? (
          <>
            {row.suggestion.label}
            {row.suggestion.detail ? <CellSub>{row.suggestion.detail}</CellSub> : null}
          </>
        ) : (
          <Chip tone="warn" icon="i-alert">
            No suggestion
          </Chip>
        ),
    },
    {
      header: 'Confidence',
      render: (row) =>
        row.state === 'confirmed' ? (
          <Chip tone="good" icon="i-check">
            Confirmed
          </Chip>
        ) : (
          <Confidence score={row.suggestion?.confidence ?? null} />
        ),
    },
    {
      header: 'Action',
      render: (row) => {
        if (row.state === 'confirmed') return <span className="sub">Ready to post</span>;
        if (row.state === 'unmatched') {
          return (
            <Row style={{ gap: 6 }}>
              <Button small onClick={() => onChange(row)}>
                Allocate
              </Button>
              <Button small variant="ghost" onClick={() => onChange(row)}>
                Leave unmatched
              </Button>
            </Row>
          );
        }
        if (row.state === 'needs-review') {
          return (
            <Row style={{ gap: 6 }}>
              <Button small onClick={() => onChange(row)}>
                Choose property
              </Button>
              <Button small variant="ghost" onClick={() => onChange(row)}>
                Leave unmatched
              </Button>
            </Row>
          );
        }
        return (
          <Row style={{ gap: 6 }}>
            <Button small variant="gold" onClick={() => onConfirm(row)}>
              Confirm
            </Button>
            <Button small variant="ghost" onClick={() => onChange(row)}>
              Change
            </Button>
          </Row>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Staged transactions"
        aside={
          <Row>
            <Button small onClick={onConfirmAll}>
              Confirm all high-confidence ({highConfidenceCount})
            </Button>
            <Button small variant="ghost">
              Filter
            </Button>
          </Row>
        }
      />
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} empty="Nothing is staged for this import." />
    </Card>
  );
}
