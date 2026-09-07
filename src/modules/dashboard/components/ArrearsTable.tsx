import { Card, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable, CellMain, type DataTableColumn } from '@/shared/components/DataTable';
import { Sub } from '@/shared/components/Layout';
import { formatMoney } from '@/shared/lib/money';
import type { ArrearsPosition, ArrearsState } from '@/modules/leases/model';
import type { IconName } from '@/shared/components/IconSprite';
import type { Tone } from '@/shared/types/common';

/** Status chips always pair colour with an icon and words (NFR-07). */
const STATE_CHIP: Record<ArrearsState, { tone: Tone; icon: IconName; label: (days: number | null) => string }> = {
  clear: { tone: 'good', icon: 'i-check', label: () => 'Current' },
  'paid-ahead': { tone: 'good', icon: 'i-check', label: () => 'Paid ahead' },
  partial: { tone: 'warn', icon: 'i-clock', label: (days) => `Partial${days === null ? '' : ` · ${days} days`}` },
  overdue: { tone: 'bad', icon: 'i-alert', label: (days) => `Overdue${days === null ? '' : ` ${days} days`}` },
  disputed: { tone: 'info', icon: 'i-pause', label: () => 'Disputed · reminders paused' },
};

const columns: readonly DataTableColumn<ArrearsPosition>[] = [
  { header: 'Tenant', lead: true, render: (row) => <CellMain>{row.tenantName}</CellMain> },
  { header: 'Property / room', mobileLabel: 'Property', render: (row) => row.propertyLabel },
  { header: 'Due', align: 'right', render: (row) => <span className="num">{formatMoney(row.due)}</span> },
  { header: 'Received', align: 'right', render: (row) => <span className="num">{formatMoney(row.received)}</span> },
  {
    header: 'Outstanding',
    align: 'right',
    render: (row) => (
      <span className="num">
        <b>{formatMoney(row.outstanding)}</b>
      </span>
    ),
  },
  {
    header: 'Status',
    render: (row) => {
      const chip = STATE_CHIP[row.state];
      return (
        <Chip tone={chip.tone} icon={chip.icon}>
          {chip.label(row.daysOverdue)}
        </Chip>
      );
    },
  },
];

/** Rent arrears, derived as due charges minus allocated receipts (BR-05). */
export function ArrearsTable({ positions }: { readonly positions: readonly ArrearsPosition[] }) {
  return (
    <Card>
      <CardHeader title="Rent arrears" aside={<Sub>Due charges − allocated receipts (BR-05)</Sub>} />
      <DataTable
        columns={columns}
        rows={positions}
        rowKey={(row) => row.leaseId}
        empty="No rent is outstanding."
      />
    </Card>
  );
}
