'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Grid, Stack, Toolbar } from '@/shared/components/Layout';
import type { TimelineEntry } from '@/shared/components/Timeline';
import { ObligationsTable } from './ObligationsTable';
import { ObligationDetail } from './ObligationDetail';
import { NewObligationForm } from './NewObligationForm';
import type { ObligationFilter, ObligationView } from '../service';

export interface NamedRecord {
  readonly id: string;
  readonly name: string;
}

export interface ObligationsScreenProps {
  /** Pre-computed views for every filter, so switching filters needs no round-trip. */
  readonly viewsByFilter: Record<ObligationFilter, readonly ObligationView[]>;
  readonly counts: Record<ObligationFilter, number>;
  /** Reminder timelines keyed by obligation id, resolved on the server. */
  readonly timelines: Record<string, readonly TimelineEntry[]>;
  /** Property and holding-entity names keyed by obligation id. */
  readonly context: Record<string, { readonly propertyName: string | null; readonly entityName: string | null }>;
  readonly initialSelectedId: string | null;
  /** Options the detail and create forms need, resolved on the server. */
  readonly people: readonly NamedRecord[];
  readonly properties: readonly NamedRecord[];
  readonly documents: readonly NamedRecord[];
  readonly today: string;
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
  people,
  properties,
  documents,
  today,
}: ObligationsScreenProps) {
  const [filter, setFilter] = useState<ObligationFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [isCreating, setCreating] = useState(false);

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
        <Button variant="primary" onClick={() => setCreating(true)}>
          + New obligation
        </Button>
      </Toolbar>

      <Grid columns={2}>
        <ObligationsTable
          rows={rows}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setCreating(false);
          }}
        />

        {isCreating ? (
          <NewObligationForm
            people={people}
            properties={properties}
            defaultDueOn={today}
            onClose={() => setCreating(false)}
          />
        ) : selected ? (
          <ObligationDetail
            view={selected}
            timeline={timelines[selected.obligation.id] ?? []}
            propertyName={context[selected.obligation.id]?.propertyName ?? null}
            holdingEntityName={context[selected.obligation.id]?.entityName ?? null}
            documents={documents}
            people={people}
            today={today}
          />
        ) : null}
      </Grid>
    </Stack>
  );
}
