'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { Grid, Stack, Sub, Toolbar } from '@/shared/components/Layout';
import { createEntityAction, createRelationshipAction } from '../actions';
import { EntityList, type EntityRow } from './EntityList';
import { EntityBreakdownCard } from './EntityBreakdownCard';
import { OwnershipMap } from './OwnershipMap';
import type { EntityId } from '@/shared/types/common';
import type { EntityFilter, EntityHoldings } from '../service';
import type { RelationKind } from '../model';

const FILTER_OPTIONS: readonly { value: EntityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'individual', label: 'Individuals' },
  { value: 'company', label: 'Companies' },
  { value: 'trust', label: 'Trusts' },
  { value: 'smsf', label: 'SMSF' },
];

const RELATION_OPTIONS: readonly { value: RelationKind; label: string }[] = [
  { value: 'owns', label: 'Ownership' },
  { value: 'director-of', label: 'Director of' },
  { value: 'trustee-of', label: 'Trustee of' },
  { value: 'beneficiary-of', label: 'Beneficiary of' },
  { value: 'member-of', label: 'Member of' },
  { value: 'borrower-of', label: 'Borrower of' },
];

type TargetType = 'property' | 'entity';

interface NamedOption {
  readonly id: string;
  readonly name: string;
}

export interface EntitiesScreenProps {
  readonly rowsByFilter: Record<EntityFilter, readonly EntityRow[]>;
  readonly counts: Record<EntityFilter, number>;
  /** Each entity's property balance sheet, keyed by entity id, for the breakdown card. */
  readonly holdingsByEntity: Readonly<Record<string, EntityHoldings>>;
  /** Options for the relationship form's subject and entity target. */
  readonly entities: readonly NamedOption[];
  /** Options for the relationship form's property target. */
  readonly properties: readonly NamedOption[];
  /** Default "effective from" date for a new relationship. */
  readonly today: string;
}

/** FR-01, BR-02 — entities, relationships and the ownership map. */
export function EntitiesScreen({
  rowsByFilter,
  counts,
  holdingsByEntity,
  entities,
  properties,
  today,
}: EntitiesScreenProps) {
  const [filter, setFilter] = useState<EntityFilter>('all');
  const [isCreating, setCreating] = useState(false);
  const [isCreatingRelation, setCreatingRelation] = useState(false);
  const [subjectId, setSubjectId] = useState(entities[0]?.id ?? '');
  const [relationKind, setRelationKind] = useState<RelationKind>('owns');
  const [targetType, setTargetType] = useState<TargetType>('property');

  const [selectedEntityId, setSelectedEntityId] = useState<EntityId | undefined>(rowsByFilter.all[0]?.entry.entity.id);

  // Looked up in the unfiltered list so a filter change never drops the selection.
  const selected = rowsByFilter.all.find((row) => row.entry.entity.id === selectedEntityId);
  const selectedHoldings = selectedEntityId ? holdingsByEntity[selectedEntityId] : undefined;

  // An entity cannot be related to itself.
  const targetEntities = entities.filter((entity) => entity.id !== subjectId);

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
        <Button
          variant="primary"
          onClick={() => {
            setCreatingRelation(false);
            setCreating(true);
          }}
        >
          + Add entity
        </Button>
        <Button
          onClick={() => {
            setCreating(false);
            setCreatingRelation(true);
          }}
        >
          + Add relationship
        </Button>
      </Toolbar>

      <Grid columns={2}>
        <EntityList rows={rowsByFilter[filter]} selectedId={selectedEntityId} onSelect={setSelectedEntityId} />

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
        ) : isCreatingRelation ? (
          <Card>
            <CardHeader title="Add relationship" aside={<Sub>Ownership or control</Sub>} />
            <CardBody>
              <ActionForm
                action={createRelationshipAction}
                submitLabel="Record relationship"
                onCancel={() => setCreatingRelation(false)}
                onSuccess={() => setCreatingRelation(false)}
                footnote={
                  <Sub style={{ fontSize: 12 }}>
                    An ownership relationship states a percentage share. A director, trustee, beneficiary or member
                    link carries control but no ownership share (BR-02).
                  </Sub>
                }
              >
                {({ fieldErrors }) => (
                  <FieldGrid>
                    <SelectField
                      id="rel-subject" name="subjectEntityId" label="Entity" required
                      value={subjectId}
                      onChange={(event) => setSubjectId(event.target.value)}
                      options={entities.map((entity) => ({ value: entity.id, label: entity.name }))}
                    />
                    <SelectField
                      id="rel-kind" name="kind" label="Relationship"
                      value={relationKind}
                      onChange={(event) => setRelationKind(event.target.value as RelationKind)}
                      options={RELATION_OPTIONS}
                    />
                    <SelectField
                      id="rel-target-type" name="targetType" label="Target"
                      value={targetType}
                      onChange={(event) => setTargetType(event.target.value as TargetType)}
                      options={[
                        { value: 'property', label: 'A property' },
                        { value: 'entity', label: 'Another entity' },
                      ]}
                    />
                    {/* Only one target is rendered, so only one reaches the action. */}
                    {targetType === 'property' ? (
                      <SelectField
                        id="rel-target-property" name="targetPropertyId" label="Property" required
                        options={properties.map((property) => ({ value: property.id, label: property.name }))}
                        invalid={Boolean(firstError(fieldErrors, 'targetPropertyId'))}
                        hint={firstError(fieldErrors, 'targetPropertyId')}
                      />
                    ) : (
                      <SelectField
                        id="rel-target-entity" name="targetEntityId" label="Target entity" required
                        options={targetEntities.map((entity) => ({ value: entity.id, label: entity.name }))}
                        invalid={Boolean(firstError(fieldErrors, 'targetPropertyId'))}
                        hint={firstError(fieldErrors, 'targetPropertyId')}
                      />
                    )}
                    {/* Control links never submit a share, which is what BR-02 requires. */}
                    {relationKind === 'owns' ? (
                      <TextField
                        id="rel-share" name="sharePercent" label="Share %" inputMode="decimal" required
                        placeholder="50"
                        invalid={Boolean(firstError(fieldErrors, 'sharePercent'))}
                        hint={firstError(fieldErrors, 'sharePercent') ?? 'Percentage of the target this entity owns'}
                      />
                    ) : null}
                    <TextField
                      id="rel-from" name="from" label="Effective from" type="date" defaultValue={today} required
                      invalid={Boolean(firstError(fieldErrors, 'from'))}
                      hint={firstError(fieldErrors, 'from')}
                    />
                    <TextField
                      id="rel-label" name="label" label="Label" required
                      placeholder="50% Tenant in Common"
                      invalid={Boolean(firstError(fieldErrors, 'label'))}
                      hint={firstError(fieldErrors, 'label') ?? 'e.g. "Sole Director", "Corporate Trustee"'}
                    />
                  </FieldGrid>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        ) : (
          <Stack>
            {selected && selectedHoldings ? (
              <EntityBreakdownCard entity={selected.entry.entity} holdings={selectedHoldings} />
            ) : null}
            <OwnershipMap />
          </Stack>
        )}
      </Grid>
    </Stack>
  );
}
