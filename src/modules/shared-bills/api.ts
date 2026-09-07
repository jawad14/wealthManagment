/**
 * Transport-agnostic handlers for the shared bills module.
 */
import type { Money } from '@/shared/lib/money';
import { sumMoney } from '@/shared/lib/money';
import { sharedBillsService } from './service';
import type { BillAllocation } from './model';
import type { SharedBillQuery } from './validation';
import { accessService } from '@/modules/access/service';

export const sharedBillsApi = {
  list(query: SharedBillQuery): {
    readonly items: readonly BillAllocation[];
    readonly counts: Record<string, number>;
    readonly totalRecovered: Money;
    readonly totalOwnerExpense: Money;
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('expense.read');
    const all = sharedBillsService.listAllocations();
    return {
      items: sharedBillsService.applyFilter(all, query.filter),
      counts: sharedBillsService.counts(),
      totalRecovered: sumMoney(all.map((entry) => entry.recovered)),
      totalOwnerExpense: sumMoney(all.map((entry) => entry.ownerExpense)),
    };
  },

  get(billId: string): BillAllocation {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('expense.read');
    return sharedBillsService.allocate(billId);
  },
};
