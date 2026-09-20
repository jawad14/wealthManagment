/**
 * Transport-agnostic handlers for the dashboard module.
 */
import { resolveAsOfDate } from '@/shared/config/app-config';
import { dashboardService } from './service';
import { accessService } from '@/modules/access/service';

export const dashboardApi = {
  /**
   * `entityId` narrows the balance-sheet figures to one consolidated entity
   * (FR-09 scope switching). An unknown id falls back to the whole portfolio.
   */
  overview(asOf?: string, entityId?: string) {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('portfolio.totals.read');
    return dashboardService.overview(asOf ?? resolveAsOfDate(), dashboardService.resolveScope(entityId));
  },

  /** Net worth with its components and movement (BR-01). */
  netWorth(asOf?: string, entityId?: string) {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('portfolio.totals.read');
    return dashboardService.netWorth(asOf ?? resolveAsOfDate(), dashboardService.resolveScope(entityId)?.entityId);
  },

  /** Per-entity consolidated positions (BR-02). */
  ownership(asOf?: string, entityId?: string) {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('portfolio.totals.read');
    return dashboardService.ownershipPositions(
      asOf ?? resolveAsOfDate(),
      dashboardService.resolveScope(entityId)?.entityId,
    );
  },

  /** Choices for the scope switcher. */
  scopeOptions() {
    accessService.guard('portfolio.totals.read');
    return dashboardService.scopeOptions();
  },
};
