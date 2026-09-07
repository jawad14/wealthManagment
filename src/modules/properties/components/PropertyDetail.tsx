'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/Icon';
import { DataTable, CellMain, type DataTableColumn } from '@/shared/components/DataTable';
import { Row, Sub } from '@/shared/components/Layout';
import { Tabs } from '@/shared/components/Tabs';
import { useToast } from '@/shared/shell/ToastContext';
import { formatMoney, type Money } from '@/shared/lib/money';
import type { Tone } from '@/shared/types/common';
import type { IconName } from '@/shared/components/IconSprite';
import type { ArrearsState } from '@/modules/leases/model';

export interface RoomRow {
  readonly componentId: string;
  readonly label: string;
  readonly tenantName: string | null;
  readonly vacantSinceLabel: string | null;
  readonly termLabel: string | null;
  readonly rent: Money | null;
  readonly frequencyLabel: string | null;
  readonly balance: Money | null;
  readonly state: ArrearsState | null;
}

const STATE_CHIP: Record<ArrearsState, { tone: Tone; icon: IconName; label: string }> = {
  clear: { tone: 'good', icon: 'i-check', label: 'Current' },
  'paid-ahead': { tone: 'good', icon: 'i-check', label: 'Paid ahead' },
  partial: { tone: 'warn', icon: 'i-clock', label: 'Partial' },
  overdue: { tone: 'bad', icon: 'i-alert', label: 'Overdue' },
  disputed: { tone: 'info', icon: 'i-pause', label: 'Disputed' },
};

export interface PropertyDetailProps {
  readonly title: string;
  readonly holdingNote: string;
  readonly rooms: readonly RoomRow[];
  readonly componentNoun: string;
  readonly valuationDetail: string | null;
  readonly valuationAmount: Money | null;
}

type DetailTab = 'overview' | 'rooms' | 'loans' | 'obligations' | 'documents' | 'valuations' | 'history';

/**
 * Property detail card.
 *
 * The closing note is deliberate: rooms are operational components, so the
 * property counts once in net worth no matter how many rooms it has.
 */
export function PropertyDetail({
  title,
  holdingNote,
  rooms,
  componentNoun,
  valuationDetail,
  valuationAmount,
}: PropertyDetailProps) {
  const [tab, setTab] = useState<DetailTab>('rooms');
  const { toast } = useToast();

  const columns: readonly DataTableColumn<RoomRow>[] = [
    { header: componentNoun, lead: true, render: (row) => <CellMain>{row.label}</CellMain> },
    {
      header: 'Tenant',
      render: (row) =>
        row.tenantName ?? <Sub>{row.vacantSinceLabel ? `Vacant since ${row.vacantSinceLabel}` : 'Vacant'}</Sub>,
    },
    { header: 'Lease', render: (row) => row.termLabel ?? '—' },
    {
      header: 'Rent',
      align: 'right',
      render: (row) => <span className="num">{row.rent ? formatMoney(row.rent) : '—'}</span>,
    },
    { header: 'Frequency', render: (row) => row.frequencyLabel ?? '—' },
    {
      header: 'Balance',
      align: 'right',
      render: (row) =>
        row.balance === null ? (
          '—'
        ) : (
          <span
            className="num"
            style={
              row.balance.cents < 0
                ? { color: 'var(--bad)' }
                : row.balance.cents > 0
                  ? { color: 'var(--good)' }
                  : undefined
            }
          >
            {formatMoney(row.balance, { signed: true })}
          </span>
        ),
    },
    {
      header: 'Status',
      render: (row) => {
        if (row.state === null) {
          return (
            <Button small onClick={() => toast('Lease creation is not wired up in this build')}>
              Create lease
            </Button>
          );
        }
        const chip = STATE_CHIP[row.state];
        return (
          <Chip tone={chip.tone} icon={chip.icon}>
            {chip.label}
          </Chip>
        );
      },
    },
  ];

  return (
    <Card id="propDetail">
      <CardHeader style={{ flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>{title}</h3>
          <Sub>{holdingNote}</Sub>
        </div>
        <Row>
          <Button small onClick={() => toast('Add-valuation form is not wired up in this build')}>
            Add valuation
          </Button>
          <Button small onClick={() => toast('Document upload is not wired up in this build')}>
            Add document
          </Button>
          <Button small variant="ghost" aria-label="More actions">
            <Icon name="i-more" />
          </Button>
        </Row>
      </CardHeader>

      <Tabs
        style={{ padding: '0 18px' }}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'rooms', label: `${componentNoun}s & leases` },
          { value: 'loans', label: 'Loans' },
          { value: 'obligations', label: 'Obligations' },
          { value: 'documents', label: 'Documents' },
          { value: 'valuations', label: 'Valuations' },
          { value: 'history', label: 'History' },
        ]}
      />

      {tab === 'rooms' ? (
        <DataTable columns={columns} rows={rooms} rowKey={(row) => row.componentId} empty="No components recorded." />
      ) : (
        <CardBody>
          <p className="sub" style={{ margin: 0 }}>
            The {tab} tab is not part of this build. See docs/REQUIREMENTS_CHECKLIST.md.
          </p>
        </CardBody>
      )}

      <CardBody
        style={{
          borderTop: '1px solid var(--line-2)',
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          fontSize: 12.5,
          color: 'var(--muted)',
        }}
      >
        <span>
          {componentNoun}s are operational components — this property counts{' '}
          <b style={{ color: 'var(--text)' }}>once</b> in net worth.
        </span>
        {valuationDetail ? (
          <span>
            Valuation {formatMoney(valuationAmount)} · {valuationDetail}
          </span>
        ) : null}
      </CardBody>
    </Card>
  );
}
