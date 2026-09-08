'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { Button } from '@/shared/components/Button';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { Grid, Stack, Stat, Sub } from '@/shared/components/Layout';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { Timeline, type TimelineEntry } from '@/shared/components/Timeline';
import { inviteAction } from '../actions';
import { formatDateLong } from '@/shared/lib/dates';
import type { AccessRow } from '../service';
import type { ContinuityPosture } from '../model';

const columns: readonly DataTableColumn<AccessRow>[] = [
  {
    header: 'Person',
    lead: true,
    render: (row) => (
      <>
        <CellMain>{row.user.name}</CellMain>
        {row.user.emailMasked ? <CellSub>{row.user.emailMasked}</CellSub> : null}
        {row.user.external && !row.user.emailMasked ? <CellSub>External</CellSub> : null}
      </>
    ),
  },
  {
    header: 'Role',
    render: (row) =>
      row.user.role === 'portfolio-owner' ? (
        <Chip tone="gold">{row.roleLabel}</Chip>
      ) : (
        <Chip tone="neutral">{row.roleLabel}</Chip>
      ),
  },
  {
    header: 'Can see',
    render: (row) => (
      <>
        {row.grant.canSee}
        {row.grant.canSeeNote ? <CellSub>{row.grant.canSeeNote}</CellSub> : null}
      </>
    ),
  },
  {
    header: 'MFA',
    render: (row) =>
      row.user.mfa === 'on' ? (
        <Chip tone="good" icon="i-check">
          On
        </Chip>
      ) : (
        <Chip tone="warn" icon="i-alert">
          Not required
        </Chip>
      ),
  },
  { header: 'Last active', render: (row) => row.grant.lastActiveLabel },
];

export interface AccessScreenProps {
  readonly people: readonly AccessRow[];
  readonly auditEntries: readonly TimelineEntry[];
  readonly continuity: ContinuityPosture;
  readonly properties: readonly { readonly id: string; readonly name: string }[];
}

/** NFR-01, NFR-03 — access control, audit trail and continuity posture. */
export function AccessScreen({ people, auditEntries, continuity, properties }: AccessScreenProps) {
  const [isInviting, setInviting] = useState(false);

  return (
    <Stack>
      <Grid columns={2}>
        <Card>
          <CardHeader
            title="People with access"
            aside={
              <Button small variant="primary" onClick={() => setInviting((open) => !open)}>
                {isInviting ? 'Close' : 'Invite'}
              </Button>
            }
          />

          {isInviting ? (
            <CardBody style={{ borderBottom: '1px solid var(--line-2)' }}>
              <ActionForm
                action={inviteAction}
                submitLabel="Send invitation"
                onCancel={() => setInviting(false)}
                onSuccess={() => setInviting(false)}
                footnote={
                  <Sub style={{ fontSize: 12 }}>
                    Grants start restricted. Choose the properties this person may reach — leaving none selected grants
                    access to nothing until you widen it.
                  </Sub>
                }
              >
                {({ fieldErrors }) => (
                  <FieldGrid>
                    <TextField
                      id="inv-name" name="name" label="Name" required placeholder="A. Kumar"
                      invalid={Boolean(firstError(fieldErrors, 'name'))}
                      hint={firstError(fieldErrors, 'name')}
                    />
                    <TextField
                      id="inv-email" name="email" label="Email" type="email" required placeholder="name@example.com"
                      invalid={Boolean(firstError(fieldErrors, 'email'))}
                      hint={firstError(fieldErrors, 'email')}
                    />
                    <SelectField
                      id="inv-role" name="role" label="Role" required
                      invalid={Boolean(firstError(fieldErrors, 'role'))}
                      hint={firstError(fieldErrors, 'role')}
                      options={[
                        { value: '', label: 'Choose a role…' },
                        { value: 'operations-delegate', label: 'Operations delegate' },
                        { value: 'family-contributor', label: 'Family contributor' },
                        { value: 'accountant-readonly', label: 'Accountant · read-only' },
                      ]}
                    />
                    <TextField
                      id="inv-expires" name="expiresOn" label="Grant expires" type="date"
                      invalid={Boolean(firstError(fieldErrors, 'expiresOn'))}
                      hint={firstError(fieldErrors, 'expiresOn') ?? 'Required for an external reviewer'}
                    />
                    <div className="field" style={{ gridColumn: '1 / -1' }}>
                      <label htmlFor="inv-properties">Properties this person may reach</label>
                      <select id="inv-properties" name="propertyIds" multiple size={4}>
                        {properties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                      <span className="hint">Nothing selected means no property access</span>
                    </div>
                  </FieldGrid>
                )}
              </ActionForm>
            </CardBody>
          ) : null}

          <DataTable columns={columns} rows={people} rowKey={(row) => row.grant.id} empty="Nobody has access yet." />
        </Card>

        <Card>
          <CardHeader title="Audit log" aside={<a href="#export">Export</a>} />
          <CardBody>
            <Timeline entries={auditEntries} />
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader title="Emergency access & continuity" aside={<Sub>Explicit, time-limited, audited</Sub>} />
        <CardBody className="grid g3">
          <Stat
            label="Nominated emergency contact"
            value={continuity.emergencyContactName}
            meta={continuity.emergencyContactNote}
          />
          <Stat
            label="Continuity instructions"
            value={`Last reviewed ${formatDateLong(continuity.instructionsReviewedOn)}`}
            meta={continuity.instructionsNote}
          />
          <Stat label="Backups" value={continuity.backupsSummary} meta={continuity.backupsNote} />
        </CardBody>
      </Card>
    </Stack>
  );
}
