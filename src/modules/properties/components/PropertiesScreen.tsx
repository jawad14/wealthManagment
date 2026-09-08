'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { Grid, Stack, Sub, Toolbar } from '@/shared/components/Layout';
import { PropertyCard, type PropertyCardProps } from './PropertyCard';
import { createPropertyAction } from '../actions';
import type { PropertyFilter } from '../service';

export interface PropertiesScreenProps {
  /** Cards precomputed per filter on the server. */
  readonly cardsByFilter: Record<PropertyFilter, readonly PropertyCardProps[]>;
  readonly counts: Record<PropertyFilter, number>;
  readonly entities: readonly { readonly id: string; readonly name: string }[];
  readonly today: string;
}

const FILTER_OPTIONS: readonly { value: PropertyFilter; label: string }[] = [
  { value: 'all', label: 'All properties' },
  { value: 'rented', label: 'Rented' },
  { value: 'own-home', label: 'Own home' },
  { value: 'stale-valuation', label: 'Stale valuation' },
];

/** FR-02 — the property grid with its filter row. */
export function PropertiesScreen({ cardsByFilter, counts, entities, today }: PropertiesScreenProps) {
  const [filter, setFilter] = useState<PropertyFilter>('all');
  const [isCreating, setCreating] = useState(false);

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
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Add property
        </Button>
      </Toolbar>

      {isCreating ? (
        <Card>
          <CardHeader title="Add property" aside={<Sub>Ownership is recorded with the property</Sub>} />
          <CardBody>
            <ActionForm
              action={createPropertyAction}
              submitLabel="Add property"
              onCancel={() => setCreating(false)}
              onSuccess={() => setCreating(false)}
              footnote={
                <Sub style={{ fontSize: 12 }}>
                  A new property has no agreed consolidation method, so it will appear as an ownership gap until one is
                  chosen. Record a valuation from the property&apos;s own page.
                </Sub>
              }
            >
              {({ fieldErrors }) => (
                <FieldGrid>
                  <TextField
                    id="prop-name" name="name" label="Name" required placeholder="166 Compton Rd, Woodridge"
                    invalid={Boolean(firstError(fieldErrors, 'name'))}
                    hint={firstError(fieldErrors, 'name')}
                  />
                  <TextField id="prop-address" name="fullAddress" label="Full address" placeholder="166 Compton Rd, Woodridge QLD 4114" />
                  <SelectField
                    id="prop-owner" name="ownerEntityId" label="Owned by" required
                    options={[{ value: '', label: 'Choose an entity…' }, ...entities.map((e) => ({ value: e.id, label: e.name }))]}
                  />
                  <TextField
                    id="prop-share" name="sharePercent" label="Ownership share (%)" defaultValue="100"
                    invalid={Boolean(firstError(fieldErrors, 'sharePercent'))}
                    hint={firstError(fieldErrors, 'sharePercent')}
                  />
                  <SelectField
                    id="prop-status" name="status" label="Status" defaultValue="rented"
                    options={[
                      { value: 'rented', label: 'Rented' },
                      { value: 'own-home', label: 'Own home' },
                      { value: 'vacant', label: 'Vacant' },
                      { value: 'under-construction', label: 'Under construction' },
                    ]}
                  />
                  <SelectField
                    id="prop-mode" name="rentalMode" label="Let as" defaultValue="whole"
                    options={[
                      { value: 'whole', label: 'Whole property' },
                      { value: 'by-room', label: 'By room' },
                      { value: 'not-rented', label: 'Not rented' },
                    ]}
                  />
                  <TextField id="prop-settled" name="settledOn" label="Settled on" type="date" defaultValue={today} />
                </FieldGrid>
              )}
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}

      <Grid columns={3}>
        {cardsByFilter[filter].map((card) => (
          <PropertyCard key={card.property.id} {...card} />
        ))}
      </Grid>
    </Stack>
  );
}
