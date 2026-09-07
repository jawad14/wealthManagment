/**
 * Transport-agnostic handlers for the entities module.
 */
import { resolveAsOfDate } from '@/shared/config/app-config';
import { entitiesService, type EntityWithRelationships } from './service';
import type { EntityQuery } from './validation';
import type { OwnershipClaim } from './model';
import { accessService } from '@/modules/access/service';

export const entitiesApi = {
  list(query: EntityQuery): {
    readonly asOf: string;
    readonly items: readonly EntityWithRelationships[];
    readonly counts: Record<string, number>;
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('entity.read');
    const asOf = query.asOf ?? resolveAsOfDate();
    return {
      asOf,
      items: entitiesService.listWithRelationships(asOf, query.filter),
      counts: entitiesService.countByKind(),
    };
  },

  /** Every direct ownership claim — the input the consolidation engine uses. */
  ownershipClaims(asOf?: string): readonly OwnershipClaim[] {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('entity.read');
    return entitiesService.resolveOwnershipClaims(asOf ?? resolveAsOfDate());
  },
};
