'use client';

import { useMemo, useState } from 'react';
import { Banner } from '@/shared/components/Banner';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { Sub } from '@/shared/components/Layout';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { formatDateLong } from '@/shared/lib/dates';
import { createLeaseAction } from '../actions';
import type { RentFrequency } from '../model';

export interface NewLeaseFormProps {
  /** Where the new lease would sit, e.g. "Room 6 · 166 Compton Rd". */
  readonly targetLabel: string;
  readonly suggestedReference: string;
  readonly defaultStartsOn: string;
  readonly defaultEndsOn: string;
  readonly defaultRent: string;
  readonly defaultBond: string;
  /**
   * Policies still awaiting approval. Rendered as blocking notes rather than
   * being silently applied — an unapproved rule must not shape stored data.
   */
  readonly pendingPolicies: {
    readonly bondHandling: boolean;
    readonly proration: boolean;
  };
  /** Where the lease can be attached, and who can take it. */
  readonly propertyId: string;
  readonly componentId: string | null;
  readonly tenants: readonly { readonly id: string; readonly name: string }[];
  readonly onClose?: () => void;
}

const FREQUENCY_OPTIONS: readonly { value: RentFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

/**
 * Count the charges the term would generate by walking the actual schedule.
 *
 * An approximation from the term length is off by one whenever the term is a
 * whole number of periods, so the walk is worth the few iterations.
 */
function projectCharges(startsOn: string, endsOn: string, frequency: RentFrequency): number {
  const end = new Date(`${endsOn}T00:00:00Z`);
  const cursor = new Date(`${startsOn}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || end < cursor) return 0;

  let count = 0;
  while (cursor <= end && count < 1000) {
    count += 1;
    if (frequency === 'monthly') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (frequency === 'weekly' ? 7 : 14));
  }
  return count;
}

/** FR-05 — create a lease, with the charge schedule previewed before saving. */
export function NewLeaseForm({
  targetLabel,
  suggestedReference,
  defaultStartsOn,
  defaultEndsOn,
  defaultRent,
  defaultBond,
  pendingPolicies,
  propertyId,
  componentId,
  tenants,
  onClose,
}: NewLeaseFormProps) {
  const [startsOn, setStartsOn] = useState(defaultStartsOn);
  const [endsOn, setEndsOn] = useState(defaultEndsOn);
  const [frequency, setFrequency] = useState<RentFrequency>('weekly');

  const chargeCount = useMemo(() => projectCharges(startsOn, endsOn, frequency), [startsOn, endsOn, frequency]);

  return (
    <Card>
      <CardHeader title="New lease" aside={<Sub>{targetLabel}</Sub>} />
      <CardBody>
        <ActionForm
          action={createLeaseAction}
          submitLabel="Create lease"
          onCancel={onClose}
          onSuccess={onClose}
          hiddenFields={{
            propertyId,
            ...(componentId ? { componentId } : {}),
            chargeAnchorOn: startsOn,
          }}
          footnote={
            <Banner tone="info" icon="i-clock" title={`${chargeCount} expected charges will be created`}>
              {FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.label} from {formatDateLong(startsOn)} to{' '}
              {formatDateLong(endsOn)}.
              {pendingPolicies.proration
                ? ' First partial period not prorated — proration rule awaiting approval.'
                : ''}
            </Banner>
          }
        >
          {({ fieldErrors }) => (
            <FieldGrid>
              <SelectField
                id="f0" name="tenantId" label="Existing tenant"
                options={[{ value: '', label: 'New tenant…' }, ...tenants.map((t) => ({ value: t.id, label: t.name }))]}
              />
              <TextField
                id="f1" name="tenantName" label="New tenant name" placeholder="A. Nguyen"
                invalid={Boolean(firstError(fieldErrors, 'tenantName'))}
                hint={firstError(fieldErrors, 'tenantName') ?? 'Leave blank if choosing an existing tenant'}
              />
              <TextField
                id="f2" name="reference" label="Billing reference" required
                defaultValue={suggestedReference}
                hint="Tenants put this on their transfer so receipts auto-match"
              />
              <SelectField
                id="f6" name="frequency" label="Frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RentFrequency)}
                options={FREQUENCY_OPTIONS}
              />
              <TextField
                id="f3" name="startsOn" label="Start date" type="date"
                value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required
              />
              <TextField
                id="f4" name="endsOn" label="End date" type="date"
                value={endsOn} onChange={(e) => setEndsOn(e.target.value)} required
                invalid={Boolean(firstError(fieldErrors, 'endsOn'))}
                hint={firstError(fieldErrors, 'endsOn')}
              />
              <TextField
                id="f5" name="rent" label="Rent" required defaultValue={defaultRent.replace(/[$,]/g, '')}
                invalid={Boolean(firstError(fieldErrors, 'rent'))}
                hint={firstError(fieldErrors, 'rent')}
              />
              <TextField
                id="f7" name="bond" label="Bond" defaultValue={defaultBond.replace(/[$,]/g, '')}
                invalid={pendingPolicies.bondHandling}
                hint={
                  pendingPolicies.bondHandling
                    ? 'Bond handling policy not yet approved — recorded only, no charge generated'
                    : 'Held per the approved bond policy'
                }
              />
              <SelectField
                id="f8" name="reminders" label="Reminders" defaultValue="on"
                options={[
                  { value: 'on', label: 'On — in-app + email' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </FieldGrid>
          )}
        </ActionForm>
      </CardBody>
    </Card>
  );
}
