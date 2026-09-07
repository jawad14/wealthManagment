/**
 * Transport-agnostic handlers for the access module.
 * Route files under src/app/api are thin adapters over these.
 */
import { accessService, type AccessRow } from './service';
import type { AuditEvent, ContinuityPosture } from './model';
import type { AuditQuery } from './validation';

export interface AccessOverview {
  readonly people: readonly AccessRow[];
  readonly auditEvents: readonly AuditEvent[];
  readonly continuity: ContinuityPosture;
}

export const accessApi = {
  getOverview(): AccessOverview {
    return {
      people: accessService.listAccess(),
      auditEvents: accessService.listAuditEvents(),
      continuity: accessService.getContinuityPosture(),
    };
  },

  listAuditEvents(query: AuditQuery): readonly AuditEvent[] {
    return accessService.listAuditEvents(query.limit);
  },
};
