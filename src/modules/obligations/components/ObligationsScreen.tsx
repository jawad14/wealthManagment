'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Grid, Stack, Toolbar } from '@/shared/components/Layout';
import { useToast } from '@/shared/shell/ToastContext';
import type { TimelineEntry } from '@/shared/components/Timeline';
import { ObligationsTable } from './ObligationsTable';
import { ObligationDetail } from './ObligationDetail';
import type { ObligationFilter, ObligationView } from '../service';

export interface ObligationsScreenProps {
  /** Pre-computed views for every filter, so switching filters needs no round-trip. */
  readonly viewsByFilter: Record<ObligationFilter, readonly ObligationView[]>;
  readonly counts: Record<ObligationFilter, number>;
  /** Reminder timelines keyed by obligation id, resolved on the server. */
  readonly timelines: Record<string, readonly TimelineEntry[]>;
  /** Property and holding-entity names keyed by obligation id. */
  readonly context: Record<string, { readonly propertyName: string | null; readonly entityName: string | null }>;
  readonly initialSelectedId: string | null;
}

const FILTER_OPTIONS: readonly { value: ObligationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due-this-week', label: 'Due this week' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'no-owner', label: 'No owner' },
  { value: 'paid', label: 'Paid' },
];

/** FR-03 / FR-08 — the obligations list with its detail panel. */
export function ObligationsScreen({
  viewsByFilter,
  counts,
  timelines,
  context,
  initialSelectedId,
}: ObligationsScreenProps) {
  const [filter, setFilter] = useState<ObligationFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const { toast } = useToast();

  const rows = viewsByFilter[filter];
  const selected = useMemo(
    () => viewsByFilter.all.find((view) => view.obligation.id === selectedId) ?? null,
    [viewsByFilter, selectedId],
  );

  return (
    <Stack>
      <Toolbar>
        <FilterGroup
          label="Filter obligations"
          options={FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            // "Paid" carries no badge in the design; a zero count stays hidden.
            ...(counts[option.value] > 0 && option.value !== 'paid' ? { count: counts[option.value] } : {}),
          }))}
          value={filter}
          onChange={setFilter}
        />
        <Button variant="primary" onClick={() => toast('New obligation form is not wired up in this build')}>
          + New obligation
        </Button>
      </Toolbar>

      <Grid columns={2}>
        <ObligationsTable rows={rows} selectedId={selectedId} onSelect={setSelectedId} />
        {selected ? (
          <ObligationDetail
            view={selected}
            timeline={timelines[selected.obligation.id] ?? []}
            propertyName={context[selected.obligation.id]?.propertyName ?? null}
            holdingEntityName={context[selected.obligation.id]?.entityName ?? null}
          />
        ) : null}
      </Grid>
    </Stack>
  );
}
