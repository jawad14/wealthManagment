'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { Grid, Stack, Sub, Toolbar } from '@/shared/components/Layout';
import { createEntityAction } from '../actions';
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
  const [isCreating, setCreating] = useState(false);

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
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Add entity
        </Button>
      </Toolbar>

      <Grid columns={2}>
        <EntityList rows={rowsByFilter[filter]} />

        {isCreating ? (
          <Card>
            <CardHeader title="Add entity" aside={<Sub>Ownership is recorded separately</Sub>} />
            <CardBody>
              <ActionForm
                action={createEntityAction}
                submitLabel="Add entity"
                onCancel={() => setCreating(false)}
                onSuccess={() => setCreating(false)}
                footnote={
                  <Sub style={{ fontSize: 12 }}>
                    Adding an entity records who exists. What it owns is a separate, dated relationship — and a
                    director, trustee or beneficiary link never carries an ownership share (BR-02).
                  </Sub>
                }
              >
                {({ fieldErrors }) => (
                  <FieldGrid>
                    <TextField
                      id="ent-name" name="name" label="Name" required placeholder="Esteem Development Pty Ltd"
                      invalid={Boolean(firstError(fieldErrors, 'name'))}
                      hint={firstError(fieldErrors, 'name')}
                    />
                    <SelectField
                      id="ent-kind" name="kind" label="Kind" defaultValue="individual"
                      options={[
                        { value: 'individual', label: 'Individual' },
                        { value: 'company', label: 'Company' },
                        { value: 'trust', label: 'Trust' },
                        { value: 'smsf', label: 'SMSF' },
                      ]}
                    />
                    <TextField
                      id="ent-descriptor" name="descriptor" label="Descriptor"
                      placeholder="Company · ACN 6xx xxx xxx"
                      hint="Shown as the chip under the name"
                    />
                    <SelectField
                      id="ent-consolidation" name="consolidation" label="Consolidation" defaultValue="look-through"
                      hint="Look-through counts its assets at your share; manual summary is excluded from totals"
                      options={[
                        { value: 'look-through', label: 'Look-through' },
                        { value: 'manual-summary', label: 'Manual summary — read-only' },
                        { value: 'excluded', label: 'Excluded' },
                      ]}
                    />
                  </FieldGrid>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        ) : (
          <OwnershipMap />
        )}
      </Grid>
    </Stack>
  );
}
