'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Grid, Stack, Toolbar } from '@/shared/components/Layout';
import { useToast } from '@/shared/shell/ToastContext';
import { PropertyCard, type PropertyCardProps } from './PropertyCard';
import type { PropertyFilter } from '../service';

export interface PropertiesScreenProps {
  /** Cards precomputed per filter on the server. */
  readonly cardsByFilter: Record<PropertyFilter, readonly PropertyCardProps[]>;
  readonly counts: Record<PropertyFilter, number>;
}

const FILTER_OPTIONS: readonly { value: PropertyFilter; label: string }[] = [
  { value: 'all', label: 'All properties' },
  { value: 'rented', label: 'Rented' },
  { value: 'own-home', label: 'Own home' },
  { value: 'stale-valuation', label: 'Stale valuation' },
];

/** FR-02 — the property grid with its filter row. */
export function PropertiesScreen({ cardsByFilter, counts }: PropertiesScreenProps) {
  const [filter, setFilter] = useState<PropertyFilter>('all');
  const { toast } = useToast();

  return (
    <Stack>
      <Toolbar>
        <FilterGroup
          label="Filter properties"
          options={FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            ...(option.value === 'all' || option.value === 'stale-valuation'
              ? { count: counts[option.value] }
              : {}),
          }))}
          value={filter}
          onChange={setFilter}
        />
        <Button variant="primary" onClick={() => toast('Add-property form is not wired up in this build')}>
          + Add property
        </Button>
      </Toolbar>

      <Grid columns={3}>
        {cardsByFilter[filter].map((card) => (
          <PropertyCard key={card.property.id} {...card} />
        ))}
      </Grid>
    </Stack>
  );
}
