/**
 * Transport-agnostic handlers for the dashboard module.
 */
import { resolveAsOfDate } from '@/shared/config/app-config';
import { dashboardService } from './service';
import { accessService } from '@/modules/access/service';

export const dashboardApi = {
  overview(asOf?: string) {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('portfolio.totals.read');
    return dashboardService.overview(asOf ?? resolveAsOfDate());
  },

  /** Net worth with its components and movement (BR-01). */
  netWorth(asOf?: string) {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('portfolio.totals.read');
    return dashboardService.netWorth(asOf ?? resolveAsOfDate());
  },

  /** Per-entity consolidated positions (BR-02). */
  ownership(asOf?: string) {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('portfolio.totals.read');
    return dashboardService.ownershipPositions(asOf ?? resolveAsOfDate());
  },
};
