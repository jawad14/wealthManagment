'use client';

import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { Sub } from '@/shared/components/Layout';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { createObligationAction } from '../actions';

export interface NewObligationFormProps {
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly properties: readonly { readonly id: string; readonly name: string }[];
  readonly onClose: () => void;
  readonly defaultDueOn: string;
}

/** FR-03 — create an obligation. */
export function NewObligationForm({ people, properties, onClose, defaultDueOn }: NewObligationFormProps) {
  return (
    <Card>
      <CardHeader title="New obligation" aside={<Sub>Owner, due date and evidence</Sub>} />
      <CardBody>
        <ActionForm action={createObligationAction} submitLabel="Create obligation" onCancel={onClose} onSuccess={onClose}
          footnote={
            <Sub style={{ fontSize: 12 }}>
              Leaving the owner unassigned is allowed, but the obligation will not be eligible for reminders until
              somebody is accountable for it.
            </Sub>
          }
        >
          {({ fieldErrors }) => (
            <FieldGrid>
              <TextField
                id="ob-title"
                name="title"
                label="Title"
                placeholder="Landlord insurance renewal"
                required
                invalid={Boolean(firstError(fieldErrors, 'title'))}
                hint={firstError(fieldErrors, 'title')}
              />
              <TextField
                id="ob-context"
                name="contextLabel"
                label="Context"
                placeholder="166 Compton Rd · Terri Scheer"
              />
              <TextField
                id="ob-due"
                name="dueOn"
                label="Due date"
                type="date"
                defaultValue={defaultDueOn}
                required
                invalid={Boolean(firstError(fieldErrors, 'dueOn'))}
                hint={firstError(fieldErrors, 'dueOn')}
              />
              <SelectField
                id="ob-recurrence"
                name="recurrence"
                label="Recurs"
                defaultValue="once"
                options={[
                  { value: 'once', label: 'Once' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
              <SelectField
                id="ob-owner"
                name="ownerUserId"
                label="Owner"
                options={[{ value: '', label: 'Not assigned' }, ...people.map((p) => ({ value: p.id, label: p.name }))]}
              />
              <SelectField
                id="ob-property"
                name="propertyId"
                label="Property"
                options={[
                  { value: '', label: 'Not property-specific' },
                  ...properties.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <TextField
                id="ob-amount"
                name="amount"
                label="Amount"
                placeholder="1,860.00"
                hint={firstError(fieldErrors, 'amount') ?? 'Leave blank where there is no fixed amount'}
                invalid={Boolean(firstError(fieldErrors, 'amount'))}
              />
            </FieldGrid>
          )}
        </ActionForm>
      </CardBody>
    </Card>
  );
}
