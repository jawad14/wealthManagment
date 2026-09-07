/**
 * Transport-agnostic handlers for the leases module.
 */
import { resolveAsOfDate } from '@/shared/config/app-config';
import type { Money } from '@/shared/lib/money';
import { leasesService, type LeaseView } from './service';
import type { ArrearsPosition } from './model';
import type { LeaseQuery } from './validation';
import { accessService } from '@/modules/access/service';

export const leasesApi = {
  list(query: LeaseQuery): {
    readonly asOf: string;
    readonly items: readonly LeaseView[];
    readonly counts: Record<string, number>;
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('lease.read');
    const asOf = query.asOf ?? resolveAsOfDate();
    return { asOf, items: leasesService.listViews(asOf, query.filter), counts: leasesService.counts(asOf) };
  },

  /** Arrears positions with the totals behind them (BR-05). */
  arrears(asOf?: string): {
    readonly asOf: string;
    readonly total: Money;
    readonly tenantCount: number;
    readonly disputedCount: number;
    readonly positions: readonly ArrearsPosition[];
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('lease.read');
    const resolvedAsOf = asOf ?? resolveAsOfDate();
    const summary = leasesService.arrearsSummary(resolvedAsOf);
    return { asOf: resolvedAsOf, ...summary, positions: leasesService.listArrears(resolvedAsOf) };
  },
};
