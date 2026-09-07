/**
 * Obligations data access.
 */
import { createCollection } from '@/server/db/collection';
import type { ObligationId } from '@/shared/types/common';
import type { Obligation, ReminderEvent } from './model';
import { seedObligations, seedReminderEvents } from './data/seed';

const obligations = createCollection<Obligation>('obligations.obligations', seedObligations);
const reminders = createCollection<ReminderEvent>('obligations.reminders', seedReminderEvents);

export const obligationsRepository = {
  list: (): readonly Obligation[] => obligations.list(),
  find: (id: ObligationId): Obligation | undefined => obligations.find(id),
  insert: (obligation: Obligation): Obligation => obligations.insert(obligation),
  update: (id: ObligationId, changes: Partial<Omit<Obligation, 'id'>>): Obligation | undefined =>
    obligations.update(id, changes),

  listReminders: (obligationId: ObligationId): readonly ReminderEvent[] =>
    [...reminders.where((event) => event.obligationId === obligationId)].sort((a, b) => a.at.localeCompare(b.at)),
  insertReminder: (event: ReminderEvent): ReminderEvent => reminders.insert(event),

  /** Restore both collections to their seeded state. Used by tests. */
  reset: (): void => {
    obligations.reset();
    reminders.reset();
  },
};
