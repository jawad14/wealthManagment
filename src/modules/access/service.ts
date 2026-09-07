/**
 * Access business logic.
 *
 * Other modules use `resolveUserName` / `requireUser` to render people without
 * reaching into the access repository themselves.
 */
import { randomUUID } from 'node:crypto';
import { ForbiddenError, NotFoundError } from '@/shared/lib/errors';
import type { EntityId, IsoDateTime, PropertyId, UserId } from '@/shared/types/common';
import { accessRepository } from './repository';
import { CURRENT_USER_ID } from './data/seed';
import { ROLE_LABELS, type AccessGrant, type AuditEvent, type AuditOutcome, type ContinuityPosture, type User } from './model';
import {
  canReachEntity,
  canReachProperty,
  capabilitiesFor,
  hasCapability,
  type AccessScope,
  type Capability,
} from './permissions';

export interface AccessRow {
  readonly user: User;
  readonly grant: AccessGrant;
  readonly roleLabel: string;
}

export const accessService = {
  /** The signed-in user. A session lookup replaces this when authentication lands. */
  getCurrentUser(): User {
    return accessService.requireUser(CURRENT_USER_ID);
  },

  requireUser(id: UserId): User {
    const user = accessRepository.findUser(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  },

  /**
   * The effective permission scope for a user (NFR-01).
   *
   * Built from the role's capabilities and the grant's record scope. This is the
   * single object every guard consults — there is no second source of truth.
   */
  scopeFor(userId: UserId): AccessScope {
    const user = accessService.requireUser(userId);
    const grant = accessRepository.findGrantForUser(userId);

    return {
      userId,
      role: user.role,
      capabilities: capabilitiesFor(user.role),
      // Deny by default: a user with no grant is restricted to nothing.
      scope: grant?.scope ?? 'restricted',
      propertyIds: grant?.propertyIds ?? [],
      entityIds: grant?.entityIds ?? [],
    };
  },

  currentScope(): AccessScope {
    return accessService.scopeFor(CURRENT_USER_ID);
  },

  /**
   * Assert that the caller holds a capability, and return their scope.
   *
   * Every module `api.ts` opens with this. Placing it at the module API — rather
   * than in a route file or a component — is what makes the check unavoidable:
   * pages, JSON routes, exports and jobs all enter through the same door.
   */
  guard(capability: Capability): AccessScope {
    const scope = accessService.currentScope();
    accessService.requireCapability(scope, capability);
    return scope;
  },

  /**
   * Assert a capability, throwing if it is absent.
   *
   * Guards throw rather than returning false so a forgotten check cannot
   * silently fall through to returning data.
   */
  requireCapability(scope: AccessScope, capability: Capability): void {
    if (!hasCapability(scope, capability)) {
      throw new ForbiddenError(
        `This account does not have permission to ${capability.replace(/[.]/g, ' ')}.`,
      );
    }
  },

  requireProperty(scope: AccessScope, propertyId: PropertyId): void {
    accessService.requireCapability(scope, 'property.read');
    if (!canReachProperty(scope, propertyId)) {
      throw new ForbiddenError('This property is outside your access.');
    }
  },

  requireEntity(scope: AccessScope, entityId: EntityId): void {
    accessService.requireCapability(scope, 'entity.read');
    if (!canReachEntity(scope, entityId)) {
      throw new ForbiddenError('This entity is outside your access.');
    }
  },

  /** Filter a list down to the records a scope may reach. */
  filterProperties<T extends { readonly id: PropertyId }>(
    scope: AccessScope,
    records: readonly T[],
  ): readonly T[] {
    if (scope.scope === 'all') return records;
    return records.filter((record) => scope.propertyIds.includes(record.id));
  },

  /** Display name for a user id; falls back to "Unknown" rather than throwing in views. */
  resolveUserName(id: UserId | null | undefined): string | null {
    if (!id) return null;
    return accessRepository.findUser(id)?.name ?? 'Unknown';
  },

  /** The access table: every person with a grant, in seeded order. */
  listAccess(): readonly AccessRow[] {
    return accessRepository.listGrants().flatMap((grant) => {
      const user = accessRepository.findUser(grant.userId);
      if (!user) return [];
      return [{ user, grant, roleLabel: ROLE_LABELS[user.role] }];
    });
  },

  listAuditEvents(limit?: number): readonly AuditEvent[] {
    const events = accessRepository.listAuditEvents();
    return limit === undefined ? events : events.slice(0, limit);
  },

  getContinuityPosture(): ContinuityPosture {
    return accessRepository.getContinuityPosture();
  },

  /**
   * Append an audit entry. Every state change in the platform routes through
   * here so the log is complete by construction (NFR-03).
   */
  record(input: {
    readonly actor: string;
    readonly summary: string;
    readonly context: string;
    readonly outcome?: AuditOutcome;
    readonly at?: IsoDateTime;
  }): AuditEvent {
    return accessRepository.appendAuditEvent({
      id: `audit-${randomUUID()}`,
      at: input.at ?? new Date().toISOString(),
      actor: input.actor,
      summary: input.summary,
      context: input.context,
      outcome: input.outcome ?? 'ok',
    });
  },
};
