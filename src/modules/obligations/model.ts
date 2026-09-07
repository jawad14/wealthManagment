/**
 * Obligations & reminders domain model (FR-03, FR-08).
 *
 * Two rules drive the whole module:
 *  1. **Payment evidence closes an obligation; a sent reminder does not.**
 *     `paidOn` is only set alongside evidence, so "we chased them" can never be
 *     mistaken for "it is paid".
 *  2. **An obligation without an owner is not eligible for reminders.** Nobody
 *     is accountable for an unowned item, so the platform refuses to send on it
 *     and shows the gap instead of quietly doing nothing.
 */
import type { DocumentId, IsoDate, IsoDateTime, ObligationId, PropertyId, UserId } from '@/shared/types/common';
import type { Money } from '@/shared/lib/money';

export type Recurrence = 'once' | 'monthly' | 'quarterly' | 'yearly';

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: 'Once',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

/** What backs the obligation. "No invoice" is a warning state, not an absence. */
export type EvidenceState = 'attached' | 'missing' | 'none';

export interface Evidence {
  readonly state: EvidenceState;
  /** Chip text, e.g. "Bill attached", "No invoice", "—". */
  readonly label: string;
  readonly documentId?: DocumentId;
}

export type ReminderChannel = 'in-app' | 'email';

export interface ReminderPolicy {
  readonly enabled: boolean;
  readonly channels: readonly ReminderChannel[];
  /** How many days before the due date the reminder is sent. */
  readonly daysBefore: number;
  /** Sending is suppressed inside this window and deferred to the next open hour. */
  readonly quietHours: { readonly fromHour: number; readonly toHour: number; readonly timezone: string };
  /** Days after the due date at which an unpaid item escalates to an owner task. */
  readonly escalateAfterDays: number;
}

export type ReminderOutcome = 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled' | 'skipped';

export interface ReminderEvent {
  readonly id: string;
  readonly obligationId: ObligationId;
  readonly at: IsoDateTime;
  readonly channel: ReminderChannel;
  readonly outcome: ReminderOutcome;
  readonly note: string;
  /**
   * Idempotency key: `obligation:recipient:channel:scheduledDate` (FR-08).
   *
   * A repeated job run computes the same key and finds the existing event, so
   * re-execution cannot produce a duplicate send. This is why retries are safe
   * without a distributed lock.
   */
  readonly dispatchKey?: string;
  readonly recipientId?: UserId;
}

/** Build the unique event-recipient-channel key a retry will recompute. */
export function buildDispatchKey(input: {
  readonly obligationId: ObligationId;
  readonly recipientId: UserId;
  readonly channel: ReminderChannel;
  readonly scheduledFor: IsoDate;
}): string {
  return `${input.obligationId}:${input.recipientId}:${input.channel}:${input.scheduledFor}`;
}

/** Why a scheduled reminder was not sent. Recorded, never silent. */
export type SkipReason = 'paid' | 'disputed' | 'no-owner' | 'reminders-off' | 'quiet-hours' | 'already-sent';

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  paid: 'Cancelled · obligation was paid',
  disputed: 'Cancelled · obligation is disputed',
  'no-owner': 'Skipped · no owner assigned',
  'reminders-off': 'Skipped · reminders turned off',
  'quiet-hours': 'Deferred · inside quiet hours',
  'already-sent': 'Skipped · already sent for this schedule',
};

/** The outcome of one dispatch attempt. */
export interface DispatchResult {
  readonly obligationId: ObligationId;
  readonly dispatchKey: string;
  readonly sent: boolean;
  readonly skipReason: SkipReason | null;
}

export interface Obligation {
  readonly id: ObligationId;
  readonly title: string;
  /** Secondary line, e.g. "166 Compton Rd · Terri Scheer". */
  readonly contextLabel: string;
  readonly propertyId?: PropertyId;
  readonly dueOn: IsoDate;
  readonly recurrence: Recurrence;
  /** Null means unowned — the item cannot be reminded on until this is set. */
  readonly ownerUserId: UserId | null;
  /** Null for obligations with no fixed amount, such as a rate review. */
  readonly amount: Money | null;
  readonly evidence: Evidence;
  /** Set only when payment evidence has been recorded. */
  readonly paidOn?: IsoDate;
  readonly disputed: boolean;
  readonly reminderPolicy: ReminderPolicy;
  /** When the obligation was validated as reminder-eligible. */
  readonly validatedAt?: IsoDateTime;
  readonly validatedBy?: UserId;
}

/**
 * Derived lifecycle state. Never stored — always computed from `paidOn`,
 * `disputed`, `dueOn`, ownership and reminder history, so it cannot go stale.
 */
export type ObligationStatus =
  | 'paid'
  | 'disputed'
  | 'overdue'
  | 'reminder-queued'
  | 'scheduled'
  | 'not-eligible';

/** Why an obligation cannot receive reminders. Null means it is eligible. */
export type ReminderIneligibility = 'no-owner' | 'disputed' | 'paid' | 'reminders-off';

export const INELIGIBILITY_LABELS: Record<ReminderIneligibility, string> = {
  'no-owner': 'Not eligible for reminders',
  disputed: 'Reminders paused · disputed',
  paid: 'Closed · paid',
  'reminders-off': 'Reminders turned off',
};
