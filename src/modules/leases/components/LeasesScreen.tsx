'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Grid, Stack, Toolbar } from '@/shared/components/Layout';
import { formatMoney } from '@/shared/lib/money';
import { formatDateCompact, formatDateShort } from '@/shared/lib/dates';
import type { Tone } from '@/shared/types/common';
import type { IconName } from '@/shared/components/IconSprite';
import { useToast } from '@/shared/shell/ToastContext';
import { FREQUENCY_SUFFIX, type LeaseStatus } from '../model';
import type { LeaseFilter, LeaseView } from '../service';
import { NewLeaseForm, type NewLeaseFormProps } from './NewLeaseForm';

const STATUS_CHIP: Record<LeaseStatus, { tone: Tone; icon: IconName; label: (days: number) => string }> = {
  active: { tone: 'good', icon: 'i-check', label: () => 'Active' },
  'ending-soon': { tone: 'warn', icon: 'i-clock', label: (days) => `Ends in ${days} days` },
  disputed: { tone: 'info', icon: 'i-pause', label: () => 'Disputed' },
  ended: { tone: 'neutral', icon: 'i-x', label: () => 'Ended' },
};

const FILTER_OPTIONS: readonly { value: LeaseFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'ending-soon', label: 'Ending in 60 days' },
  { value: 'ended', label: 'Ended' },
];

const columns: readonly DataTableColumn<LeaseView>[] = [
  {
    header: 'Tenant',
    lead: true,
    render: (row) => (
      <>
        <CellMain>{row.tenantName}</CellMain>
        <CellSub>Ref {row.lease.reference}</CellSub>
      </>
    ),
  },
  { header: 'Property · component', mobileLabel: 'Property', render: (row) => row.propertyLabel },
  {
    header: 'Term',
    render: (row) => `${formatDateCompact(row.lease.startsOn)} – ${formatDateCompact(row.lease.endsOn)}`,
  },
  {
    header: 'Rent',
    align: 'right',
    render: (row) => (
      <span className="num">
        {formatMoney(row.lease.rent)} / {FREQUENCY_SUFFIX[row.lease.frequency]}
      </span>
    ),
  },
  {
    header: 'Next charge',
    render: (row) => (row.nextChargeOn ? formatDateShort(row.nextChargeOn) : 'Paused'),
  },
  {
    header: 'Status',
    render: (row) => {
      const chip = STATUS_CHIP[row.status];
      return (
        <Chip tone={chip.tone} icon={chip.icon}>
          {chip.label(row.daysUntilEnd)}
        </Chip>
      );
    },
  },
];

export interface LeasesScreenProps {
  readonly viewsByFilter: Record<LeaseFilter, readonly LeaseView[]>;
  readonly counts: Record<LeaseFilter, number>;
  readonly newLease: NewLeaseFormProps;
}

/** FR-05 — leases, tenants and the new-lease form. */
export function LeasesScreen({ viewsByFilter, counts, newLease }: LeasesScreenProps) {
  const [filter, setFilter] = useState<LeaseFilter>('active');
  const { toast } = useToast();

  return (
    <Stack>
      <Toolbar>
        <FilterGroup
          label="Filter leases"
          options={FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            ...(counts[option.value] > 0 && option.value !== 'ended' ? { count: counts[option.value] } : {}),
          }))}
          value={filter}
          onChange={setFilter}
        />
        <Button variant="primary" onClick={() => toast('Use the form on the right to create a lease')}>
          + New lease
        </Button>
      </Toolbar>

      <Grid columns={2}>
        <Card>
          <DataTable
            columns={columns}
            rows={viewsByFilter[filter]}
            rowKey={(row) => row.lease.id}
            empty="No leases match this filter."
          />
        </Card>
        <NewLeaseForm {...newLease} />
      </Grid>
    </Stack>
  );
}
