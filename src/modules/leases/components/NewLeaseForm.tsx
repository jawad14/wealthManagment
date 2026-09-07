'use client';

import { useMemo, useState } from 'react';
import { Banner } from '@/shared/components/Banner';
import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { Row, Sub } from '@/shared/components/Layout';
import { useToast } from '@/shared/shell/ToastContext';
import { formatDateLong } from '@/shared/lib/dates';
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
}: NewLeaseFormProps) {
  const { toast } = useToast();
  const [startsOn, setStartsOn] = useState(defaultStartsOn);
  const [endsOn, setEndsOn] = useState(defaultEndsOn);
  const [frequency, setFrequency] = useState<RentFrequency>('weekly');

  const chargeCount = useMemo(() => projectCharges(startsOn, endsOn, frequency), [startsOn, endsOn, frequency]);

  return (
    <Card>
      <CardHeader title="New lease" aside={<Sub>{targetLabel}</Sub>} />
      <CardBody className="stack">
        <FieldGrid>
          <TextField id="f1" label="Tenant" placeholder="Search or add tenant" />
          <TextField
            id="f2"
            label="Billing reference"
            defaultValue={suggestedReference}
            hint="Tenants put this on their transfer so receipts auto-match"
          />
          <TextField id="f3" label="Start date" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          <TextField id="f4" label="End date" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          <TextField id="f5" label="Rent" defaultValue={defaultRent} />
          <SelectField
            id="f6"
            label="Frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RentFrequency)}
            options={FREQUENCY_OPTIONS}
          />
          <TextField
            id="f7"
            label="Bond"
            defaultValue={defaultBond}
            invalid={pendingPolicies.bondHandling}
            hint={
              pendingPolicies.bondHandling
                ? 'Bond handling policy not yet approved — record only, no charge generated'
                : 'Held per the approved bond policy'
            }
          />
          <SelectField
            id="f8"
            label="Reminders"
            options={[
              { value: 'on', label: 'On — in-app + email, 3 days before due' },
              { value: 'off', label: 'Off' },
            ]}
          />
        </FieldGrid>

        <Banner tone="info" icon="i-clock" title={`${chargeCount} expected charges will be created`}>
          {FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.label} from {formatDateLong(startsOn)} to{' '}
          {formatDateLong(endsOn)}.
          {pendingPolicies.proration
            ? ' First partial week not prorated — proration rule awaiting approval.'
            : ''}
        </Banner>

        <Row>
          <Button variant="primary" onClick={() => toast('Lease creation is not wired up in this build')}>
            Create lease
          </Button>
          <Button variant="ghost">Cancel</Button>
        </Row>
      </CardBody>
    </Card>
  );
}
