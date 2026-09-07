'use client';

import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/Icon';
import { Row, Stat, Sub } from '@/shared/components/Layout';
import { Timeline, type TimelineEntry } from '@/shared/components/Timeline';
import { useToast } from '@/shared/shell/ToastContext';
import { formatMoney } from '@/shared/lib/money';
import { formatDateLong } from '@/shared/lib/dates';
import { INELIGIBILITY_LABELS } from '../model';
import type { ObligationView } from '../service';

export interface ObligationDetailProps {
  readonly view: ObligationView;
  readonly timeline: readonly TimelineEntry[];
  /** Property name resolved by the server, so this component stays presentational. */
  readonly propertyName: string | null;
  readonly holdingEntityName: string | null;
}

/**
 * Detail panel for the selected obligation, including its reminder schedule.
 *
 * The action row reflects the closing rule: attaching payment evidence is the
 * only action that can close the item.
 */
export function ObligationDetail({ view, timeline, propertyName, holdingEntityName }: ObligationDetailProps) {
  const { toast } = useToast();
  const { obligation } = view;

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

        <Row>
          <Button variant="gold" onClick={() => toast('Attach payment evidence to close this obligation')}>
            <Icon name="i-upload" />
            Attach payment evidence
          </Button>
          <Button onClick={() => toast('Reminder settings are edited from the obligation record')}>
            Edit reminder
          </Button>
          <Button variant="ghost" onClick={() => toast('Marking as disputed pauses reminders')}>
            Mark disputed
          </Button>
        </Row>

        <Sub style={{ fontSize: 12 }}>
          Payment evidence closes this obligation; a sent reminder does not.
        </Sub>
      </CardBody>
    </Card>
  );
}
