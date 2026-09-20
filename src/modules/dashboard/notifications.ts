/**
 * The top bar's notification feed.
 *
 * Composed on read from the modules that own the facts — nothing here is
 * stored, so an item disappears the moment its cause is resolved. Narrowed by
 * the reader's scope the same way search is, so the bell cannot leak a record
 * its own screen would refuse to show.
 */
import { addDays, formatDateShort } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import type { IsoDate } from '@/shared/types/common';
import type { NotificationItem } from '@/shared/types/notifications';
import { accessService } from '@/modules/access/service';
import { canReachProperty, hasCapability, type AccessScope } from '@/modules/access/permissions';
import { leasesService } from '@/modules/leases/service';
import { obligationsService, type ObligationView } from '@/modules/obligations/service';
import { reconciliationService } from '@/modules/reconciliation/service';

/** How far ahead an unpaid obligation counts as "due soon". */
export const NOTIFICATION_WINDOW_DAYS = 14;

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function obligationDescription(view: ObligationView, timing: string): string {
  const { obligation } = view;
  return [obligation.contextLabel, obligation.amount ? formatMoney(obligation.amount) : null, timing]
    .filter(Boolean)
    .join(' · ');
}

export function getNotifications(
  asOf: IsoDate,
  scope: AccessScope = accessService.currentScope(),
): readonly NotificationItem[] {
  const items: NotificationItem[] = [];

  if (hasCapability(scope, 'lease.read')) {
    leasesService
      .listArrears(asOf)
      .filter((position) => canReachProperty(scope, leasesService.require(position.leaseId).propertyId))
      .forEach((position) => {
        const daysLate = position.daysOverdue ?? 0;
        items.push({
          id: `rent-overdue-${position.leaseId}`,
          group: 'action-required',
          tone: 'bad',
          title: `Rent overdue · ${position.tenantName}`,
          description: `${formatMoney(position.outstanding)} outstanding · ${plural(daysLate, 'day')} late · ${
            position.propertyLabel
          }${position.disputed ? ' · disputed' : ''}`,
          timestamp: addDays(asOf, -daysLate),
          href: '/leases',
        });
      });
  }

  if (hasCapability(scope, 'obligation.read')) {
    // An obligation with no property is portfolio-level; the capability covers it.
    const reachable = (view: ObligationView): boolean =>
      !view.obligation.propertyId || canReachProperty(scope, view.obligation.propertyId);

    obligationsService
      .overdue(asOf)
      .filter(reachable)
      .forEach((view) => {
        items.push({
          id: `obligation-overdue-${view.obligation.id}`,
          group: 'action-required',
          tone: 'bad',
          title: `Overdue · ${view.obligation.title}`,
          description: obligationDescription(view, `${plural(-view.daysUntilDue, 'day')} overdue`),
          timestamp: view.obligation.dueOn,
          href: '/obligations',
        });
      });

    obligationsService
      .upcoming(asOf, NOTIFICATION_WINDOW_DAYS)
      .filter(reachable)
      .forEach((view) => {
        const timing = view.daysUntilDue === 0 ? 'due today' : `due in ${plural(view.daysUntilDue, 'day')}`;
        items.push({
          id: `obligation-upcoming-${view.obligation.id}`,
          group: 'upcoming',
          tone: 'warn',
          title: view.obligation.title,
          description: obligationDescription(view, `${timing} · ${formatDateShort(view.obligation.dueOn)}`),
          timestamp: view.obligation.dueOn,
          href: '/obligations',
        });
      });
  }

  // One item however many rows there are — a large import must not flood the panel.
  const unmatched = hasCapability(scope, 'bank-import.read') ? reconciliationService.unmatchedCount() : 0;
  if (unmatched > 0) {
    const current = reconciliationService.currentImport();
    items.push({
      id: 'unmatched-transactions',
      group: 'reminders',
      tone: 'info',
      title: `${plural(unmatched, 'unmatched bank transaction')}`,
      description: `${formatMoney(reconciliationService.unmatchedValue())} awaiting allocation${
        current ? ` · ${current.accountLabel}` : ''
      }`,
      timestamp: current?.importedOn ?? asOf,
      href: '/bank-import',
    });
  }

  return items;
}
