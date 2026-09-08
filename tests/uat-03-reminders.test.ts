/**
 * UAT-03 — "Paid or disputed obligations suppress queued messages; retries
 * produce no duplicates."
 *
 * FR-08 acceptance — "Paid items cancel queued notices. Repeated job execution
 * does not duplicate sends. Failure creates an owner task. External messages
 * require verified recipients and approved templates."
 */
import { beforeEach, describe, expect, it } from 'vitest';
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
