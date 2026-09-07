/**
 * Expenses data access.
 */
import { createCollection } from '@/server/db/collection';
import type { Expense } from './model';
import { seedExpenses } from './data/seed';

const expenses = createCollection<Expense>('expenses.expenses', seedExpenses);

export const expensesRepository = {
  /** Every expense, including voided ones — voiding hides from totals, not from view. */
  list: (): readonly Expense[] => expenses.list(),
  find: (id: string): Expense | undefined => expenses.find(id),
  insert: (expense: Expense): Expense => expenses.insert(expense),
  update: (id: string, changes: Partial<Omit<Expense, 'id'>>): Expense | undefined =>
    expenses.update(id, changes),
};
