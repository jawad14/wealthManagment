'use client';

import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { OwnerTag } from '@/shared/components/Avatar';
import { formatMoney } from '@/shared/lib/money';
import { formatDateShort } from '@/shared/lib/dates';
import type { Tone } from '@/shared/types/common';
import type { IconName } from '@/shared/components/IconSprite';
import { RECURRENCE_LABELS, type EvidenceState, type ObligationStatus } from '../model';
import type { ObligationView } from '../service';

const STATUS_CHIP: Record<ObligationStatus, { tone: Tone; icon?: IconName }> = {
  paid: { tone: 'good', icon: 'i-check' },
  disputed: { tone: 'info', icon: 'i-pause' },
  overdue: { tone: 'bad', icon: 'i-alert' },
  'reminder-queued': { tone: 'info', icon: 'i-clock' },
  scheduled: { tone: 'neutral' },
  'not-eligible': { tone: 'warn', icon: 'i-alert' },
};

const EVIDENCE_CHIP: Record<EvidenceState, { tone: Tone; icon?: IconName }> = {
  attached: { tone: 'neutral' },
  missing: { tone: 'warn', icon: 'i-alert' },
  none: { tone: 'neutral' },
};

export interface ObligationsTableProps {
  readonly rows: readonly ObligationView[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}

export function ObligationsTable({ rows, selectedId, onSelect }: ObligationsTableProps) {
  const columns: readonly DataTableColumn<ObligationView>[] = [
    {
      header: 'Obligation',
      lead: true,
      render: (row) => (
        <>
          <CellMain>{row.obligation.title}</CellMain>
          <CellSub>{row.obligation.contextLabel}</CellSub>
        </>
      ),
    },
    { header: 'Due', render: (row) => formatDateShort(row.obligation.dueOn) },
    { header: 'Recurs', render: (row) => RECURRENCE_LABELS[row.obligation.recurrence] },
    {
      header: 'Owner',
      render: (row) => <OwnerTag name={row.ownerName} short unassignedLabel="Assign" />,
    },
    {
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="num">{formatMoney(row.obligation.amount)}</span>,
    },
    {
      header: 'Evidence',
      render: (row) => {
        const chip = EVIDENCE_CHIP[row.obligation.evidence.state];
        return (
          <Chip tone={chip.tone} icon={chip.icon}>
            {row.obligation.evidence.label}
          </Chip>
        );
      },
    },
    {
      header: 'Status',
      render: (row) => {
        const chip = STATUS_CHIP[row.status];
        return (
          <Chip tone={chip.tone} icon={chip.icon}>
            {row.statusLabel}
          </Chip>
        );
      },
    },
  ];

  return (
    <Card>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.obligation.id}
        onRowClick={(row) => onSelect(row.obligation.id)}
        isRowSelected={(row) => row.obligation.id === selectedId}
        rowStyle={(row) => (row.obligation.id === selectedId ? { background: 'var(--gold-soft)' } : undefined)}
        empty="No obligations match this filter."
      />
    </Card>
  );
}
