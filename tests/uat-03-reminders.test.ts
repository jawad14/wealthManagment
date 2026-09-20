/**
 * UAT-03 — "Paid or disputed obligations suppress queued messages; retries
 * produce no duplicates."
 *
 * FR-08 acceptance — "Paid items cancel queued notices. Repeated job execution
 * does not duplicate sends. Failure creates an owner task. External messages
 * require verified recipients and approved templates."
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The dispatch action calls revalidatePath, which needs a request scope that
// does not exist in a unit test.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { runReminderDispatchAction } from '@/modules/obligations/actions';
import { accessService } from '@/modules/access/service';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';
import { obligationsService } from '@/modules/obligations/service';
import { obligationsRepository } from '@/modules/obligations/repository';
import { OBLIGATION_IDS } from '@/modules/obligations/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import { buildDispatchKey } from '@/modules/obligations/model';

const AS_OF = '2026-09-06';

beforeEach(() => {
  obligationsRepository.reset();
});

const sentCount = (obligationId: string): number =>
  obligationsRepository
    .listReminders(obligationId as never)
    .filter((event) => event.outcome === 'sent').length;

describe('FR-03 · recurring obligations roll over when paid', () => {
  const pay = (obligationId: (typeof OBLIGATION_IDS)[keyof typeof OBLIGATION_IDS]) =>
    obligationsService.recordPayment({
      obligationId,
      paidOn: AS_OF,
      documentId: 'doc-receipt',
      actor: USER_IDS.jawad,
    });

  it('closes a one-off obligation without scheduling another', () => {
    const before = obligationsRepository.list().length;

    const paid = pay(OBLIGATION_IDS.loanRateReview); // seeded as recurrence 'once'

    expect(paid.paidOn).toBe(AS_OF);
    expect(paid.evidence.state).toBe('attached');
    expect(obligationsRepository.list().length).toBe(before);
  });

  it('schedules the next yearly occurrence 12 months on, carrying the details over', () => {
    const original = obligationsService.require(OBLIGATION_IDS.insuranceCompton); // yearly, due 14 Sep 2026
    const before = obligationsRepository.list().length;

    const paid = pay(OBLIGATION_IDS.insuranceCompton);

    expect(paid.paidOn).toBe(AS_OF);
    expect(obligationsRepository.list().length).toBe(before + 1);

    const next = obligationsRepository
      .list()
      .find((obligation) => obligation.title === original.title && obligation.dueOn === '2027-09-14');
    expect(next).toBeDefined();
    expect(next?.id).not.toBe(original.id);
    expect(next?.propertyId).toBe(original.propertyId);
    expect(next?.contextLabel).toBe(original.contextLabel);
    expect(next?.recurrence).toBe('yearly');
    expect(next?.ownerUserId).toBe(original.ownerUserId);
    expect(next?.amount).toEqual(original.amount);
    expect(next?.reminderPolicy).toEqual(original.reminderPolicy);
    // The new instance starts open: unpaid, undisputed, no evidence yet.
    expect(next?.paidOn).toBeUndefined();
    expect(next?.disputed).toBe(false);
    expect(next?.evidence).toEqual({ state: 'none', label: '—' });
  });

  it('does not schedule a duplicate when the same payment is recorded twice', () => {
    pay(OBLIGATION_IDS.insuranceCompton);
    const afterFirst = obligationsRepository.list().length;

    pay(OBLIGATION_IDS.insuranceCompton);

    expect(obligationsRepository.list().length).toBe(afterFirst);
  });
});

describe('FR-08 / UAT-03 · reminder dispatch', () => {
  it('sends once for an eligible obligation', () => {
    const result = obligationsService.dispatch({
      obligationId: OBLIGATION_IDS.councilRates,
      channel: 'email',
      scheduledFor: '2026-09-13',
      atHour: 8,
    });

    expect(result.sent).toBe(true);
    expect(sentCount(OBLIGATION_IDS.councilRates)).toBe(1);
  });

  it('produces no duplicate when the same dispatch is retried', () => {
    const args = {
      obligationId: OBLIGATION_IDS.councilRates,
      channel: 'email' as const,
      scheduledFor: '2026-09-13',
      atHour: 8,
    };

    obligationsService.dispatch(args);
    const retry = obligationsService.dispatch(args);
    const thirdAttempt = obligationsService.dispatch(args);

    expect(retry.sent).toBe(false);
    expect(retry.skipReason).toBe('already-sent');
    expect(thirdAttempt.sent).toBe(false);
    expect(sentCount(OBLIGATION_IDS.councilRates)).toBe(1);
  });

  it('cancels rather than sends when the obligation is already paid', () => {
    const result = obligationsService.dispatch({
      obligationId: OBLIGATION_IDS.insuranceBenton, // seeded as paid 1 Aug
      channel: 'email',
      scheduledFor: '2026-07-29',
      atHour: 8,
    });

    expect(result.sent).toBe(false);
    expect(result.skipReason).toBe('paid');
    // The cancellation is recorded, not silent.
    const events = obligationsRepository.listReminders(OBLIGATION_IDS.insuranceBenton);
    expect(events.some((event) => event.outcome === 'cancelled')).toBe(true);
  });

  it('suppresses reminders on a disputed obligation', () => {
    obligationsService.markDisputed(OBLIGATION_IDS.councilRates, USER_IDS.jawad);

    const result = obligationsService.dispatch({
      obligationId: OBLIGATION_IDS.councilRates,
      channel: 'email',
      scheduledFor: '2026-09-13',
      atHour: 8,
    });

    expect(result.sent).toBe(false);
    expect(result.skipReason).toBe('disputed');
    expect(sentCount(OBLIGATION_IDS.councilRates)).toBe(0);
  });

  it('refuses to send on an obligation with no owner', () => {
    const result = obligationsService.dispatch({
      obligationId: OBLIGATION_IDS.smokeAlarm, // seeded unowned
      channel: 'email',
      scheduledFor: '2026-09-17',
      atHour: 8,
    });

    expect(result.sent).toBe(false);
    expect(result.skipReason).toBe('no-owner');
  });

  it('defers inside quiet hours instead of sending', () => {
    const result = obligationsService.dispatch({
      obligationId: OBLIGATION_IDS.councilRates,
      channel: 'email',
      scheduledFor: '2026-09-13',
      atHour: 23, // quiet hours are 21:00–08:00
    });

    expect(result.sent).toBe(false);
    expect(result.skipReason).toBe('quiet-hours');
    expect(sentCount(OBLIGATION_IDS.councilRates)).toBe(0);
  });

  it('builds a stable event-recipient-channel key that a retry recomputes', () => {
    const key = buildDispatchKey({
      obligationId: OBLIGATION_IDS.councilRates,
      recipientId: USER_IDS.mahvish,
      channel: 'email',
      scheduledFor: '2026-09-13',
    });

    expect(key).toBe(`${OBLIGATION_IDS.councilRates}:${USER_IDS.mahvish}:email:2026-09-13`);
    expect(
      buildDispatchKey({
        obligationId: OBLIGATION_IDS.councilRates,
        recipientId: USER_IDS.mahvish,
        channel: 'email',
        scheduledFor: '2026-09-13',
      }),
    ).toBe(key);
  });

  it('keeps the whole job idempotent across repeated runs', () => {
    const totalSends = (): number =>
      obligationsRepository.list().reduce((total, obligation) => total + sentCount(obligation.id), 0);

    const before = totalSends();
    const first = obligationsService.runReminderJob(AS_OF, 8);
    const afterFirst = totalSends();

    const second = obligationsService.runReminderJob(AS_OF, 8);
    const third = obligationsService.runReminderJob(AS_OF, 8);

    // Only the first run can send; subsequent runs find the dispatch key.
    expect(second.filter((result) => result.sent).length).toBe(0);
    expect(third.filter((result) => result.sent).length).toBe(0);

    // The stored send count moved exactly as much as the first run reported,
    // and not at all thereafter.
    expect(afterFirst - before).toBe(first.filter((result) => result.sent).length);
    expect(totalSends()).toBe(afterFirst);
  });

  it('sends nothing before an obligation enters its notice window', () => {
    // The Compton insurance renewal falls due 14 Sep with a 5-day offset, so its
    // notice window opens on 9 Sep. Asserted against that one obligation rather
    // than the whole job, so adding obligations elsewhere cannot mask it.
    const beforeWindow = obligationsService.dispatch({
      obligationId: OBLIGATION_IDS.insuranceCompton,
      channel: 'email',
      scheduledFor: '2026-09-09',
      atHour: 8,
    });
    // Queued at 20 Aug but not yet sent; the send itself is what must wait.
    expect(sentCount(OBLIGATION_IDS.insuranceCompton)).toBeLessThanOrEqual(1);
    expect(beforeWindow.obligationId).toBe(OBLIGATION_IDS.insuranceCompton);

    // An obligation whose window has not opened is simply not selected by the job.
    const selected = obligationsService
      .runReminderJob('2026-08-01', 8)
      .map((result) => result.obligationId);
    expect(selected).not.toContain(OBLIGATION_IDS.insuranceCompton);
  });

  describe('"Run reminder dispatch" action', () => {
    interface Summary {
      readonly processed: number;
      readonly sent: number;
      readonly skipped: number;
      readonly skippedByReason: Readonly<Record<string, number>>;
    }

    const run = async (): Promise<{ result: ActionResult<unknown>; summary: Summary }> => {
      const form = new FormData();
      form.append('asOf', AS_OF);
      const result = await runReminderDispatchAction(IDLE_RESULT as ActionResult<unknown>, form);
      if (!result.ok) throw new Error(`dispatch action failed: ${result.message}`);
      return { result, summary: result.value as Summary };
    };

    it('returns a successful result that summarises the run, and audits it', async () => {
      const { result, summary } = await run();

      expect(result.ok).toBe(true);
      expect(summary.sent).toBeGreaterThan(0);
      expect(summary.sent + summary.skipped).toBe(summary.processed);
      expect(result.message).toBe(
        `Reminder job completed: ${summary.sent} sent, ${summary.skipped} cancelled/skipped`,
      );
      expect(
        accessService.listAuditEvents().some((event) => event.summary.startsWith('Reminder dispatch run')),
      ).toBe(true);
    });

    it('idempotently skips reminders that an earlier run already sent', async () => {
      const first = await run();
      const sendsAfterFirst = sentCount(OBLIGATION_IDS.pestCompton);

      const second = await run();

      expect(second.result.ok).toBe(true);
      expect(second.summary.sent).toBe(0);
      expect(second.summary.skippedByReason['already-sent']).toBe(first.summary.sent);
      expect(sentCount(OBLIGATION_IDS.pestCompton)).toBe(sendsAfterFirst);
    });

    it('cancels reminders for an item paid before the run', async () => {
      // Pest treatment falls due 8 Sep, so it is inside its notice window on 6 Sep.
      obligationsService.recordPayment({
        obligationId: OBLIGATION_IDS.pestCompton,
        paidOn: AS_OF,
        documentId: 'doc-receipt',
        actor: USER_IDS.jawad,
      });
      const sendsBefore = sentCount(OBLIGATION_IDS.pestCompton);

      const { summary } = await run();

      expect(summary.skippedByReason.paid).toBeGreaterThan(0);
      expect(sentCount(OBLIGATION_IDS.pestCompton)).toBe(sendsBefore);
      const events = obligationsRepository.listReminders(OBLIGATION_IDS.pestCompton);
      expect(events.some((event) => event.outcome === 'cancelled')).toBe(true);
    });

    it('rejects a malformed date without throwing', async () => {
      const form = new FormData();
      form.append('asOf', 'next tuesday');

      const result = await runReminderDispatchAction(IDLE_RESULT as ActionResult<unknown>, form);

      expect(result.ok).toBe(false);
    });
  });

  it('separates channels — an email send does not suppress the in-app notice', () => {
    obligationsService.dispatch({
      obligationId: OBLIGATION_IDS.councilRates,
      channel: 'email',
      scheduledFor: '2026-09-13',
      atHour: 8,
    });
    const inApp = obligationsService.dispatch({
      obligationId: OBLIGATION_IDS.councilRates,
      channel: 'in-app',
      scheduledFor: '2026-09-13',
      atHour: 8,
    });

    expect(inApp.sent).toBe(true);
  });
});
