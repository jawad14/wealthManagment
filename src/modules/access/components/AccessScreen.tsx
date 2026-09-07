import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { Button } from '@/shared/components/Button';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { Grid, Stack, Stat, Sub } from '@/shared/components/Layout';
import { Timeline, type TimelineEntry } from '@/shared/components/Timeline';
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
}

/** NFR-01, NFR-03 — access control, audit trail and continuity posture. */
export function AccessScreen({ people, auditEntries, continuity }: AccessScreenProps) {
  return (
    <Stack>
      <Grid columns={2}>
        <Card>
          <CardHeader
            title="People with access"
            aside={
              <Button small variant="primary">
                Invite
              </Button>
            }
          />
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
