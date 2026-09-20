/**
 * Notification wire types.
 *
 * These live in the shared kernel for the same reason the search types do: the
 * `dashboard` module produces them and the top bar renders them, and `shared/`
 * may not import from a feature module.
 */
import type { IsoDate } from './common';

/** 'bad' = overdue, 'warn' = due soon, 'info' = reminder. */
export type NotificationTone = 'bad' | 'warn' | 'info';

export type NotificationGroup = 'action-required' | 'upcoming' | 'reminders';

/** Display order of the groups in the panel. */
export const NOTIFICATION_GROUPS: readonly NotificationGroup[] = ['action-required', 'upcoming', 'reminders'];

export const NOTIFICATION_GROUP_LABELS: Record<NotificationGroup, string> = {
  'action-required': 'Action required',
  upcoming: 'Upcoming',
  reminders: 'Reminders',
};

export interface NotificationItem {
  readonly id: string;
  readonly group: NotificationGroup;
  readonly title: string;
  readonly description: string;
  readonly tone: NotificationTone;
  /** The date the item is about: when rent fell overdue, when a bill is due. */
  readonly timestamp: IsoDate;
  /** The screen where the item can be resolved. */
  readonly href: '/leases' | '/obligations' | '/bank-import';
}
