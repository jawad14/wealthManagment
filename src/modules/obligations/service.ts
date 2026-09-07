/**
 * Obligations business logic (FR-03, FR-08).
 */
import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '@/shared/lib/errors';
import { addDays, daysBetween, formatDateShort, isBefore } from '@/shared/lib/dates';
import { UPCOMING_WINDOW_DAYS } from '@/shared/config/app-config';
import { money, sumMoney, type Money } from '@/shared/lib/money';
import type { IsoDate, ObligationId, UserId } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import { obligationsRepository } from './repository';
import {
  SKIP_REASON_LABELS,
  buildDispatchKey,
  type DispatchResult,
  type Obligation,
  type ObligationStatus,
  type ReminderChannel,
  type ReminderEvent,
  type ReminderIneligibility,
  type SkipReason,
} from './model';

export type ObligationFilter = 'all' | 'due-this-week' | 'overdue' | 'no-owner' | 'paid';

export interface ObligationView {
  readonly obligation: Obligation;
  readonly ownerName: string | null;
  readonly status: ObligationStatus;
  /** Chip text, e.g. "Overdue 9d · reminded", "Paid 1 Aug". */
  readonly statusLabel: string;
  readonly daysUntilDue: number;
  readonly reminders: readonly ReminderEvent[];
  readonly ineligibility: ReminderIneligibility | null;
}

export const obligationsService = {
  list(): readonly Obligation[] {
    return obligationsRepository.list();
  },

  require(id: ObligationId): Obligation {
    const obligation = obligationsRepository.find(id);
    if (!obligation) throw new NotFoundError('Obligation', id);
    return obligation;
  },

  /**
   * Why an obligation cannot be reminded on, or null when it can.
   *
   * Order matters: a paid item needs no reminder, a disputed one must not be
   * chased, and an unowned one has nobody to chase on behalf of.
   */
  reminderIneligibility(obligation: Obligation): ReminderIneligibility | null {
    if (obligation.paidOn) return 'paid';
    if (obligation.disputed) return 'disputed';
    if (obligation.ownerUserId === null) return 'no-owner';
    if (!obligation.reminderPolicy.enabled) return 'reminders-off';
    return null;
  },

  /**
   * Derived status. Never persisted — a stored status drifts from reality the
   * moment a due date passes or evidence is attached.
   */
  status(obligation: Obligation, asOf: IsoDate): ObligationStatus {
    if (obligation.paidOn) return 'paid';
    if (obligation.disputed) return 'disputed';
    if (obligation.ownerUserId === null) return 'not-eligible';
    if (isBefore(obligation.dueOn, asOf)) return 'overdue';

    const reminders = obligationsRepository.listReminders(obligation.id);
    const hasQueued = reminders.some((event) => event.outcome === 'queued');
    return hasQueued ? 'reminder-queued' : 'scheduled';
  },

  statusLabel(obligation: Obligation, asOf: IsoDate): string {
    const status = obligationsService.status(obligation, asOf);
    const reminders = obligationsRepository.listReminders(obligation.id);
    const wasReminded = reminders.some((event) => event.outcome === 'sent' || event.outcome === 'failed');

    switch (status) {
      case 'paid':
        return obligation.paidOn ? `Paid ${formatDateShort(obligation.paidOn)}` : 'Paid';
      case 'disputed':
        return 'Disputed · reminders paused';
      case 'overdue': {
        const days = daysBetween(obligation.dueOn, asOf);
        return `Overdue ${days}d${wasReminded ? ' · reminded' : ''}`;
      }
      case 'not-eligible':
        return 'Not eligible for reminders';
      case 'reminder-queued':
        return 'Reminder queued';
      case 'scheduled':
        return 'Scheduled';
    }
  },

  view(obligation: Obligation, asOf: IsoDate): ObligationView {
    return {
      obligation,
      ownerName: accessService.resolveUserName(obligation.ownerUserId),
      status: obligationsService.status(obligation, asOf),
      statusLabel: obligationsService.statusLabel(obligation, asOf),
      daysUntilDue: daysBetween(asOf, obligation.dueOn),
      reminders: obligationsRepository.listReminders(obligation.id),
      ineligibility: obligationsService.reminderIneligibility(obligation),
    };
  },

  listViews(asOf: IsoDate, filter: ObligationFilter = 'all'): readonly ObligationView[] {
    return obligationsRepository
      .list()
      .map((obligation) => obligationsService.view(obligation, asOf))
      .filter((view) => matchesFilter(view, filter, asOf))
      .sort((a, b) => a.obligation.dueOn.localeCompare(b.obligation.dueOn));
  },

  counts(asOf: IsoDate): Record<ObligationFilter, number> {
    const views = obligationsRepository.list().map((obligation) => obligationsService.view(obligation, asOf));
    return {
      all: views.length,
      'due-this-week': views.filter((view) => matchesFilter(view, 'due-this-week', asOf)).length,
      overdue: views.filter((view) => matchesFilter(view, 'overdue', asOf)).length,
      'no-owner': views.filter((view) => matchesFilter(view, 'no-owner', asOf)).length,
      paid: views.filter((view) => matchesFilter(view, 'paid', asOf)).length,
    };
  },

  /** Count of obligations still needing action — drives the sidebar badge. */
  openCount(asOf: IsoDate): number {
    return obligationsRepository
      .list()
      .filter((obligation) => !obligation.paidOn && obligationsService.status(obligation, asOf) !== 'paid').length;
  },

  /** Unpaid obligations falling due inside the configured window, soonest first. */
  upcoming(asOf: IsoDate, windowDays: number = UPCOMING_WINDOW_DAYS): readonly ObligationView[] {
    const horizon = addDays(asOf, windowDays);
    return obligationsRepository
      .list()
      .filter((obligation) => !obligation.paidOn && obligation.dueOn >= asOf && obligation.dueOn <= horizon)
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
      .map((obligation) => obligationsService.view(obligation, asOf));
  },

  /** Total value and item count due inside the window, for the dashboard KPI. */
  upcomingSummary(
    asOf: IsoDate,
    windowDays: number = UPCOMING_WINDOW_DAYS,
  ): { readonly total: Money; readonly count: number; readonly withoutOwner: number } {
    const upcoming = obligationsService.upcoming(asOf, windowDays);
    return {
      total: sumMoney(upcoming.map((view) => view.obligation.amount ?? money(0))),
      count: upcoming.length,
      withoutOwner: upcoming.filter((view) => view.obligation.ownerUserId === null).length,
    };
  },

  overdue(asOf: IsoDate): readonly ObligationView[] {
    return obligationsService.listViews(asOf, 'overdue');
  },

  /**
   * The reminder schedule for an obligation, as a timeline of what happened and
   * what will happen next. Generated rather than stored so it always reflects
   * the current policy and status.
   */
  reminderTimeline(
    obligationId: ObligationId,
    asOf: IsoDate,
  ): readonly { readonly id: string; readonly state: 'done' | 'fail' | 'next' | 'pending'; readonly title: string; readonly meta: string }[] {
    const obligation = obligationsService.require(obligationId);
    const policy = obligation.reminderPolicy;
    const events = obligationsRepository.listReminders(obligationId);
    const entries: { id: string; state: 'done' | 'fail' | 'next' | 'pending'; title: string; meta: string }[] = [];

    if (obligation.validatedAt) {
      entries.push({
        id: 'validated',
        state: 'done',
        title: 'Obligation validated · eligible for reminders',
        meta: `${formatDateShort(obligation.validatedAt.slice(0, 10))} · ${accessService.resolveUserName(obligation.validatedBy) ?? 'system'}`,
      });
    }

    events.forEach((event) => {
      entries.push({
        id: event.id,
        state: event.outcome === 'failed' ? 'fail' : 'done',
        title: `Reminder ${event.outcome} · ${event.channel} · ${policy.daysBefore} days before due`,
        meta: `${event.note} · quiet hours ${policy.quietHours.fromHour}pm–${policy.quietHours.toHour}am ${policy.quietHours.timezone}`,
      });
    });

    const sendOn = addDays(obligation.dueOn, -policy.daysBefore);
    if (!obligation.paidOn && sendOn >= asOf) {
      entries.push({
        id: 'next-send',
        state: 'next',
        title: `Send on ${formatDateShort(sendOn)}, ${policy.quietHours.toHour}:00 am`,
        meta: 'Paid or disputed status rechecked before sending',
      });
    }

    if (!obligation.paidOn) {
      const escalateOn = addDays(obligation.dueOn, policy.escalateAfterDays);
      entries.push({
        id: 'escalate',
        state: 'pending',
        title: `Escalate to owner task if unpaid on ${formatDateShort(escalateOn)}`,
        meta: 'Only payment evidence closes this item',
      });
    }

    return entries;
  },

  /**
   * Close an obligation by recording payment evidence.
   *
   * Evidence is mandatory: without it the item stays open, no matter how many
   * reminders were sent.
   */
  recordPayment(input: {
    readonly obligationId: ObligationId;
    readonly paidOn: IsoDate;
    readonly documentId: string;
    readonly actor: UserId;
  }): Obligation {
    const obligation = obligationsService.require(input.obligationId);
    if (!input.documentId) {
      throw new ValidationError('Payment evidence is required to close an obligation.');
    }

    const updated = obligationsRepository.update(obligation.id, {
      paidOn: input.paidOn,
      evidence: { state: 'attached', label: 'Receipt attached', documentId: input.documentId as never },
    });
    if (!updated) throw new NotFoundError('Obligation', obligation.id);

    accessService.record({
      actor: accessService.resolveUserName(input.actor) ?? 'system',
      summary: `Payment evidence attached · ${obligation.title}`,
      context: `${obligation.contextLabel} · marked paid ${input.paidOn}`,
    });
    return updated;
  },

  /** Mark an obligation disputed, which pauses reminders without stopping accrual. */
  markDisputed(obligationId: ObligationId, actor: UserId): Obligation {
    const obligation = obligationsService.require(obligationId);
    const updated = obligationsRepository.update(obligation.id, { disputed: true });
    if (!updated) throw new NotFoundError('Obligation', obligationId);

    accessService.record({
      actor: accessService.resolveUserName(actor) ?? 'system',
      summary: `Obligation marked disputed · ${obligation.title}`,
      context: `${obligation.contextLabel} · reminders paused`,
    });
    return updated;
  },

  /** Assign an owner, which is what makes the obligation reminder-eligible. */
  assignOwner(obligationId: ObligationId, ownerUserId: UserId, actor: UserId): Obligation {
    const obligation = obligationsService.require(obligationId);
    accessService.requireUser(ownerUserId);

    const updated = obligationsRepository.update(obligation.id, {
      ownerUserId,
      validatedAt: new Date().toISOString(),
      validatedBy: actor,
    });
    if (!updated) throw new NotFoundError('Obligation', obligationId);

    accessService.record({
      actor: accessService.resolveUserName(actor) ?? 'system',
      summary: `Owner assigned · ${obligation.title}`,
      context: `${obligation.contextLabel} · now eligible for reminders`,
    });
    return updated;
  },

  /** Append a reminder event; used by the scheduler and by manual sends. */
  recordReminder(input: Omit<ReminderEvent, 'id'>): ReminderEvent {
    return obligationsRepository.insertReminder({ id: `rem-${randomUUID()}`, ...input });
  },

  /**
   * Attempt one reminder dispatch (FR-08).
   *
   * Everything about this method exists to make repeated execution safe:
   *
   *  - Status is **rechecked immediately before sending**, so an obligation paid
   *    or disputed after the reminder was queued is cancelled, not sent.
   *  - The dispatch key is recomputed from stable inputs, so a retry finds the
   *    prior event and returns without sending again.
   *  - Quiet hours defer rather than drop.
   *  - Every skip is recorded with its reason. A silent no-op would be
   *    indistinguishable from a failure.
   */
  dispatch(input: {
    readonly obligationId: ObligationId;
    readonly channel: ReminderChannel;
    readonly scheduledFor: IsoDate;
    /** Local hour of the attempt, for the quiet-hours check. */
    readonly atHour?: number;
  }): DispatchResult {
    const obligation = obligationsService.require(input.obligationId);
    const policy = obligation.reminderPolicy;

    const recipientId = obligation.ownerUserId;
    if (recipientId === null) {
      return skip(obligation.id, `${obligation.id}::${input.channel}:${input.scheduledFor}`, 'no-owner');
    }

    const dispatchKey = buildDispatchKey({
      obligationId: obligation.id,
      recipientId,
      channel: input.channel,
      scheduledFor: input.scheduledFor,
    });

    // Idempotency: a prior attempt under this key means the work is done.
    const existing = obligationsRepository
      .listReminders(obligation.id)
      .find((event) => event.dispatchKey === dispatchKey && event.outcome !== 'queued');
    if (existing) return skip(obligation.id, dispatchKey, 'already-sent');

    // Recheck status at send time, not at queue time.
    if (obligation.paidOn) {
      obligationsService.recordReminder({
        obligationId: obligation.id,
        at: new Date().toISOString(),
        channel: input.channel,
        outcome: 'cancelled',
        note: SKIP_REASON_LABELS.paid,
        dispatchKey,
        recipientId,
      });
      return skip(obligation.id, dispatchKey, 'paid');
    }

    if (obligation.disputed) {
      obligationsService.recordReminder({
        obligationId: obligation.id,
        at: new Date().toISOString(),
        channel: input.channel,
        outcome: 'cancelled',
        note: SKIP_REASON_LABELS.disputed,
        dispatchKey,
        recipientId,
      });
      return skip(obligation.id, dispatchKey, 'disputed');
    }

    if (!policy.enabled) return skip(obligation.id, dispatchKey, 'reminders-off');

    if (input.atHour !== undefined && isInQuietHours(input.atHour, policy.quietHours)) {
      return skip(obligation.id, dispatchKey, 'quiet-hours');
    }

    obligationsService.recordReminder({
      obligationId: obligation.id,
      at: new Date().toISOString(),
      channel: input.channel,
      outcome: 'sent',
      note: 'Recipient verified',
      dispatchKey,
      recipientId,
    });

    return { obligationId: obligation.id, dispatchKey, sent: true, skipReason: null };
  },

  /**
   * Run the reminder job for a date.
   * Safe to run repeatedly — each obligation's dispatch is keyed and idempotent.
   */
  runReminderJob(asOf: IsoDate, atHour = 8): readonly DispatchResult[] {
    return obligationsRepository
      .list()
      .filter((obligation) => {
        const sendOn = addDays(obligation.dueOn, -obligation.reminderPolicy.daysBefore);
        return sendOn <= asOf && obligation.dueOn >= asOf;
      })
      .flatMap((obligation) =>
        obligation.reminderPolicy.channels.map((channel) =>
          obligationsService.dispatch({
            obligationId: obligation.id,
            channel,
            scheduledFor: addDays(obligation.dueOn, -obligation.reminderPolicy.daysBefore),
            atHour,
          }),
        ),
      );
  },
};

function skip(obligationId: ObligationId, dispatchKey: string, reason: SkipReason): DispatchResult {
  return { obligationId, dispatchKey, sent: false, skipReason: reason };
}

/** Quiet hours may wrap midnight, e.g. 21:00–08:00. */
function isInQuietHours(hour: number, quiet: { readonly fromHour: number; readonly toHour: number }): boolean {
  return quiet.fromHour > quiet.toHour
    ? hour >= quiet.fromHour || hour < quiet.toHour
    : hour >= quiet.fromHour && hour < quiet.toHour;
}

function matchesFilter(view: ObligationView, filter: ObligationFilter, asOf: IsoDate): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'due-this-week': {
      const days = daysBetween(asOf, view.obligation.dueOn);
      return !view.obligation.paidOn && days >= 0 && days <= 7;
    }
    case 'overdue':
      return view.status === 'overdue';
    case 'no-owner':
      return view.obligation.ownerUserId === null;
    case 'paid':
      return Boolean(view.obligation.paidOn);
  }
}
