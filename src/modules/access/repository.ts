/**
 * Access data access. The only file in this module that touches storage.
 */
import { createCollection } from '@/server/db/collection';
import type { UserId } from '@/shared/types/common';
import type { AccessGrant, AuditEvent, User } from './model';
import { seedAccessGrants, seedAuditEvents, seedContinuityPosture, seedUsers } from './data/seed';

const users = createCollection<User>('access.users', seedUsers);
const grants = createCollection<AccessGrant>('access.grants', seedAccessGrants);
const auditEvents = createCollection<AuditEvent>('access.audit', seedAuditEvents);

export const accessRepository = {
  listUsers: (): readonly User[] => users.list(),
  findUser: (id: UserId): User | undefined => users.find(id),
  listGrants: (): readonly AccessGrant[] => grants.list(),
  findGrantForUser: (userId: UserId): AccessGrant | undefined => grants.findBy((grant) => grant.userId === userId),
  /** Audit events, newest first. */
  listAuditEvents: (): readonly AuditEvent[] => [...auditEvents.list()].sort((a, b) => b.at.localeCompare(a.at)),
  appendAuditEvent: (event: AuditEvent): AuditEvent => auditEvents.insert(event),
  getContinuityPosture: seedContinuityPosture,
};
