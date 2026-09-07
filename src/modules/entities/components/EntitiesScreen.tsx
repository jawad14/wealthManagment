'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Grid, Stack, Toolbar } from '@/shared/components/Layout';
import { useToast } from '@/shared/shell/ToastContext';
import { EntityList, type EntityRow } from './EntityList';
import { OwnershipMap } from './OwnershipMap';
import type { EntityFilter } from '../service';

const FILTER_OPTIONS: readonly { value: EntityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'individual', label: 'Individuals' },
  { value: 'company', label: 'Companies' },
  { value: 'trust', label: 'Trusts' },
  { value: 'smsf', label: 'SMSF' },
];

export interface EntitiesScreenProps {
  readonly rowsByFilter: Record<EntityFilter, readonly EntityRow[]>;
  readonly counts: Record<EntityFilter, number>;
}

/** FR-01, BR-02 — entities, relationships and the ownership map. */
export function EntitiesScreen({ rowsByFilter, counts }: EntitiesScreenProps) {
  const [filter, setFilter] = useState<EntityFilter>('all');
  const { toast } = useToast();

  return (
    <Stack>
      <Toolbar>
        <FilterGroup
          label="Filter entities"
          options={FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            ...(option.value === 'all' ? { count: counts.all } : {}),
          }))}
          value={filter}
          onChange={setFilter}
        />
        <Button variant="primary" onClick={() => toast('Add-entity form is not wired up in this build')}>
          + Add entity
        </Button>
      </Toolbar>

      <Grid columns={2}>
        <EntityList rows={rowsByFilter[filter]} />
        <OwnershipMap />
      </Grid>
    </Stack>
  );
}
