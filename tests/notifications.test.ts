/**
 * The top bar's notification feed.
 *
 * The bell composes overdue rent, overdue and upcoming obligations and unmatched
 * bank rows as of a date. Like search, it is a route that must not leak
 * restricted records, so the permission cases matter as much as the content.
 */
import { describe, expect, it } from 'vitest';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { addDays } from '@/shared/lib/dates';
import type { NotificationItem } from '@/shared/types/notifications';
import { accessService } from '@/modules/access/service';
import { USER_IDS } from '@/modules/access/data/seed';
import { LEASE_IDS } from '@/modules/leases/data/seed';
import { getNotifications, NOTIFICATION_WINDOW_DAYS } from '@/modules/dashboard/notifications';

const AS_OF = resolveAsOfDate();

function byId(items: readonly NotificationItem[], id: string): NotificationItem | undefined {
  return items.find((item) => item.id === id);
}

describe('notifications · overdue rent', () => {
  it('surfaces an arrears position with the tenant, amount and days late', () => {
    // UAT-02 fixture: A. Nguyen owes $200 of the $500 charged on 25 Aug.
    const item = byId(getNotifications(AS_OF), `rent-overdue-${LEASE_IDS.nguyenR3}`);

    expect(item?.group).toBe('action-required');
    expect(item?.tone).toBe('bad');
    expect(item?.title).toBe('Rent overdue · A. Nguyen');
    expect(item?.description).toContain('$200 outstanding');
    expect(item?.description).toContain('12 days late');
    expect(item?.timestamp).toBe('2026-08-25');
    expect(item?.href).toBe('/leases');
  });

  it('does not treat rent that was not yet due as overdue (BR-05)', () => {
    const before = getNotifications('2026-08-24');

    expect(byId(before, `rent-overdue-${LEASE_IDS.nguyenR3}`)).toBeUndefined();
  });
});

describe('notifications · obligations', () => {
  it('lists an unpaid obligation past its due date as action required', () => {
    const item = byId(getNotifications(AS_OF), 'obligation-overdue-obl-body-corporate');

    expect(item?.group).toBe('action-required');
    expect(item?.tone).toBe('bad');
    expect(item?.description).toContain('5 days overdue');
    expect(item?.timestamp).toBe('2026-09-01');
    expect(item?.href).toBe('/obligations');
  });

  it('lists obligations due inside the 14-day window as upcoming, soonest first', () => {
    const upcoming = getNotifications(AS_OF).filter((item) => item.group === 'upcoming');
    const horizon = addDays(AS_OF, NOTIFICATION_WINDOW_DAYS);

    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming.every((item) => item.tone === 'warn' && item.href === '/obligations')).toBe(true);
    expect(upcoming.every((item) => item.timestamp >= AS_OF && item.timestamp <= horizon)).toBe(true);
    expect(upcoming.map((item) => item.timestamp)).toEqual([...upcoming.map((item) => item.timestamp)].sort());

    const insurance = byId(upcoming, 'obligation-upcoming-obl-insurance-compton');
    expect(insurance?.title).toBe('Landlord insurance renewal');
    expect(insurance?.description).toContain('due in 8 days');
  });

  it('moves with the as-of date: the same obligation is upcoming, then overdue', () => {
    const id = 'obl-insurance-compton';

    // 15 days out: beyond the window, so not mentioned at all.
    const early = getNotifications('2026-08-30');
    expect(byId(early, `obligation-upcoming-${id}`)).toBeUndefined();

    const dueDay = byId(getNotifications('2026-09-14'), `obligation-upcoming-${id}`);
    expect(dueDay?.description).toContain('due today');

    const late = getNotifications('2026-09-15');
    expect(byId(late, `obligation-upcoming-${id}`)).toBeUndefined();
    expect(byId(late, `obligation-overdue-${id}`)?.tone).toBe('bad');
  });
});

describe('notifications · bank import', () => {
  it('rolls unmatched transactions into one reminder linking to the import screen', () => {
    const reminders = getNotifications(AS_OF).filter((item) => item.group === 'reminders');

    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.tone).toBe('info');
    expect(reminders[0]?.title).toBe('4 unmatched bank transactions');
    expect(reminders[0]?.href).toBe('/bank-import');
  });
});

describe('notifications · permissions', () => {
  it('shows a read-only accountant no bank-import reminder', () => {
    const items = getNotifications(AS_OF, accessService.scopeFor(USER_IDS.accountant));

    expect(items.some((item) => item.href === '/bank-import')).toBe(false);
    expect(items.some((item) => item.href === '/leases')).toBe(true);
  });

  it('keeps a delegate to obligations on their assigned properties', () => {
    const items = getNotifications(AS_OF, accessService.scopeFor(USER_IDS.mahvish));

    // Watson Rd and Mians Rd are outside the delegate's grant.
    expect(byId(items, 'obligation-overdue-obl-body-corporate')).toBeUndefined();
    expect(byId(items, 'obligation-upcoming-obl-gutter-mians')).toBeUndefined();
    expect(byId(items, 'obligation-overdue-obl-water-usage')).toBeDefined();
  });

  it('shows nothing to a role with none of the underlying capabilities', () => {
    expect(getNotifications(AS_OF, accessService.scopeFor(USER_IDS.operator))).toEqual([]);
  });
});
