/**
 * Transport-agnostic handlers for the expenses module.
 */
import { asId, type UserId } from '@/shared/types/common';
import type { Money } from '@/shared/lib/money';
import { accessService } from '@/modules/access/service';
import { expensesService, type ExpenseFilter } from './service';
import type { Expense, ExpenseView } from './model';
import type { ExpenseQuery } from './validation';

export const expensesApi = {
  list(query: ExpenseQuery): {
    readonly items: readonly ExpenseView[];
    readonly counts: Record<ExpenseFilter, number>;
    readonly total: Money;
    readonly byCategory: ReturnType<typeof expensesService.totalsByCategory>;
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('expense.read');
    const options = {
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
      ...(query.propertyId ? { propertyId: asId<'Property'>(query.propertyId) } : {}),
      ...(query.entityId ? { entityId: asId<'Entity'>(query.entityId) } : {}),
      ...(query.category ? { category: query.category } : {}),
      includeVoided: query.filter === 'voided',
    };

    return {
      items: expensesService.applyFilter(expensesService.query(options), query.filter),
      counts: expensesService.counts(),
      total: expensesService.total(options),
      byCategory: expensesService.totalsByCategory(options),
    };
  },

  get(expenseId: string): ExpenseView {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('expense.read');
    return expensesService.view(expensesService.require(expenseId));
  },

  void(expenseId: string, reason: string, actor?: UserId): Expense {
    return expensesService.void(expenseId, reason, actor ?? accessService.getCurrentUser().id);
  },
};
