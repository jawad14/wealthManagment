'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/Icon';
import { Row, Stat, Sub } from '@/shared/components/Layout';
import { Timeline, type TimelineEntry } from '@/shared/components/Timeline';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { formatMoney } from '@/shared/lib/money';
import { formatDateLong } from '@/shared/lib/dates';
import { INELIGIBILITY_LABELS } from '../model';
import {
  assignOwnerAction,
  markDisputedAction,
  recordPaymentAction,
  updateReminderAction,
} from '../actions';
import type { ObligationView } from '../service';

export interface ObligationDetailProps {
  readonly view: ObligationView;
  readonly timeline: readonly TimelineEntry[];
  /** Property name resolved by the server, so this component stays presentational. */
  readonly propertyName: string | null;
  readonly holdingEntityName: string | null;
  /** Documents that could evidence a payment, and people who could own the item. */
  readonly documents: readonly { readonly id: string; readonly name: string }[];
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly today: string;
}

/** Which inline panel the detail card is showing. */
type Panel = 'none' | 'evidence' | 'reminder' | 'owner';

/**
 * Detail panel for the selected obligation, including its reminder schedule.
 *
 * The action row reflects the closing rule: attaching payment evidence is the
 * only action that can close the item.
 */
export function ObligationDetail({
  view,
  timeline,
  propertyName,
  holdingEntityName,
  documents,
  people,
  today,
}: ObligationDetailProps) {
  const [panel, setPanel] = useState<Panel>('none');
  const { obligation } = view;
  const close = (): void => setPanel('none');
  const isClosed = Boolean(obligation.paidOn);

  return (
    <Card>
      <CardHeader
        title={obligation.title}
        aside={
          view.ineligibility ? (
            <Chip tone="warn" icon="i-alert">
              {INELIGIBILITY_LABELS[view.ineligibility]}
            </Chip>
          ) : (
            <Chip tone="gold">Selected</Chip>
          )
        }
      />
      <CardBody className="stack">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Stat label="Due" value={formatDateLong(obligation.dueOn)} />
          <Stat
            label="Amount"
            value={<span className="num">{formatMoney(obligation.amount, { showCents: true })}</span>}
          />
          <Stat label="Property" value={propertyName ?? '—'} meta={holdingEntityName ?? undefined} />
          <Stat label="Owner" value={view.ownerName ?? 'Not assigned'} />
        </div>

        <div>
          <div className="sub" style={{ marginBottom: 8, fontWeight: 500, color: 'var(--text)' }}>
            Reminder timeline
          </div>
          <Timeline entries={timeline} />
        </div>

        {panel === 'none' ? (
          <Row>
            {!isClosed ? (
              <Button variant="gold" onClick={() => setPanel('evidence')}>
                <Icon name="i-upload" />
                Attach payment evidence
              </Button>
            ) : null}
            <Button onClick={() => setPanel('reminder')}>Edit reminder</Button>
            {obligation.ownerUserId === null ? (
              <Button onClick={() => setPanel('owner')}>Assign owner</Button>
            ) : null}
            {!isClosed && !obligation.disputed ? (
              <ActionForm
                action={markDisputedAction}
                submitLabel="Mark disputed"
                render="inline"
                hiddenFields={{ obligationId: obligation.id }}
              />
            ) : null}
          </Row>
        ) : null}

        {panel === 'evidence' ? (
          <ActionForm
            action={recordPaymentAction}
            submitLabel="Record payment"
            onCancel={close}
            onSuccess={close}
            hiddenFields={{ obligationId: obligation.id }}
            footnote={
              <Sub style={{ fontSize: 12 }}>
                Only payment evidence closes this obligation. A sent reminder does not.
              </Sub>
            }
          >
            {({ fieldErrors }) => (
              <FieldGrid>
                <TextField id="ob-paid-on" name="paidOn" label="Paid on" type="date" defaultValue={today} required />
                <SelectField
                  id="ob-evidence"
                  name="documentId"
                  label="Evidence document"
                  required
                  invalid={Boolean(firstError(fieldErrors, 'documentId'))}
                  hint={firstError(fieldErrors, 'documentId') ?? 'Receipt, statement or paid invoice'}
                  options={[
                    { value: '', label: 'Choose a document…' },
                    ...documents.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </FieldGrid>
            )}
          </ActionForm>
        ) : null}

        {panel === 'reminder' ? (
          <ActionForm
            action={updateReminderAction}
            submitLabel="Save reminder"
            onCancel={close}
            onSuccess={close}
            hiddenFields={{ obligationId: obligation.id }}
          >
            {({ fieldErrors }) => (
              <FieldGrid>
                <TextField
                  id="ob-days-before"
                  name="daysBefore"
                  label="Notice period (days before due)"
                  type="number"
                  min={0}
                  max={90}
                  defaultValue={obligation.reminderPolicy.daysBefore}
                  invalid={Boolean(firstError(fieldErrors, 'daysBefore'))}
                  hint={firstError(fieldErrors, 'daysBefore')}
                />
                <SelectField
                  id="ob-reminders-on"
                  name="enabled"
                  label="Reminders"
                  defaultValue={obligation.reminderPolicy.enabled ? 'on' : 'off'}
                  options={[
                    { value: 'on', label: 'On — in-app + email' },
                    { value: 'off', label: 'Off' },
                  ]}
                />
              </FieldGrid>
            )}
          </ActionForm>
        ) : null}

        {panel === 'owner' ? (
          <ActionForm
            action={assignOwnerAction}
            submitLabel="Assign owner"
            onCancel={close}
            onSuccess={close}
            hiddenFields={{ obligationId: obligation.id }}
            footnote={
              <Sub style={{ fontSize: 12 }}>
                Assigning an owner is what makes this obligation eligible for reminders.
              </Sub>
            }
          >
            {() => (
              <FieldGrid>
                <SelectField
                  id="ob-new-owner"
                  name="ownerUserId"
                  label="Owner"
                  required
                  options={[
                    { value: '', label: 'Choose a person…' },
                    ...people.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </FieldGrid>
            )}
          </ActionForm>
        ) : null}
      </CardBody>
    </Card>
  );
}
