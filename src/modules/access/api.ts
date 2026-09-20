/**
 * Transport-agnostic handlers for the access module.
 * Route files under src/app/api are thin adapters over these.
 */
import { ForbiddenError } from '@/shared/lib/errors';
import { accessService, type AccessRow } from './service';
import { hasCapability } from './permissions';
import type { AuditEvent, ContinuityPosture } from './model';
import type { AuditQuery } from './validation';

export interface AccessOverview {
  /** Empty unless the caller holds `access.read`. */
  readonly people: readonly AccessRow[];
  /** Empty unless the caller holds `audit.read`. */
  readonly auditEvents: readonly AuditEvent[];
  /** Absent unless the caller holds `access.read`. */
  readonly continuity: ContinuityPosture | null;
  readonly canSeePeople: boolean;
  readonly canSeeAudit: boolean;
  /** Whether the caller may invite people — `inviteAction` enforces the same capability. */
  readonly canInvite: boolean;
}

export const accessApi = {
  /**
   * The screen serves two audiences: whoever manages access, and the technical
   * operator who may read the audit log only. Holding neither is a refusal;
   * holding one returns just that half.
   */
  getOverview(): AccessOverview {
    const scope = accessService.currentScope();
    const canSeePeople = hasCapability(scope, 'access.read');
    const canSeeAudit = hasCapability(scope, 'audit.read');
    if (!canSeePeople && !canSeeAudit) {
      throw new ForbiddenError('This account does not have permission to view access or the audit log.');
    }

    return {
      people: canSeePeople ? accessService.listAccess() : [],
      auditEvents: canSeeAudit ? accessService.listAuditEvents() : [],
      continuity: canSeePeople ? accessService.getContinuityPosture() : null,
      canSeePeople,
      canSeeAudit,
      canInvite: hasCapability(scope, 'access.write'),
    };
  },

  listAuditEvents(query: AuditQuery): readonly AuditEvent[] {
    accessService.guard('audit.read');
    return accessService.listAuditEvents(query.limit);
  },
};
