/**
 * Seeded access records.
 *
 * Mirrors the "Access & audit" screen of design/wealth-platform-design.html.
 * Replace this file (or the DATA_ADAPTER) with a real store for production.
 */
import { asId, type UserId } from '@/shared/types/common';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import type { AccessGrant, AuditEvent, ContinuityPosture, User } from '../model';

export const USER_IDS = {
  jawad: asId<'User'>('usr-jawad'),
  mahvish: asId<'User'>('usr-mahvish'),
  hassan: asId<'User'>('usr-hassan'),
  accountant: asId<'User'>('usr-kumar'),
  operator: asId<'User'>('usr-keyob'),
} satisfies Record<string, UserId>;

/** The signed-in user for this deployment. Replaced by a session lookup once auth lands. */
export const CURRENT_USER_ID: UserId = USER_IDS.jawad;

export function seedUsers(): readonly User[] {
  return [
    { id: USER_IDS.jawad, name: 'Jawad Siddique', emailMasked: 'jawad@…', role: 'portfolio-owner', external: false, mfa: 'on' },
    { id: USER_IDS.mahvish, name: 'Mahvish Gull', role: 'operations-delegate', external: false, mfa: 'on' },
    { id: USER_IDS.hassan, name: 'Hassan Siddique', role: 'family-contributor', external: false, mfa: 'not-required' },
    { id: USER_IDS.accountant, name: 'A. Kumar, CPA', role: 'accountant-readonly', external: true, mfa: 'on' },
    { id: USER_IDS.operator, name: 'KEYOB operator', role: 'technical-operator', external: true, mfa: 'on' },
  ];
}

export function seedAccessGrants(): readonly AccessGrant[] {
  return [
    {
      id: 'grant-jawad',
      userId: USER_IDS.jawad,
      scope: 'all',
      propertyIds: [],
      entityIds: [],
      canSee: 'Everything in this deployment',
      lastActiveAt: '2026-09-06T09:12:00.000Z',
      lastActiveLabel: 'Today 09:12',
    },
    {
      id: 'grant-mahvish',
      userId: USER_IDS.mahvish,
      scope: 'restricted',
      propertyIds: [PROPERTY_IDS.comptonRd, PROPERTY_IDS.bentonSt],
      entityIds: [],
      canSee: '166 Compton Rd, 20 Benton St · bills & rent tasks',
      canSeeNote: 'No whole-portfolio totals',
      lastActiveAt: '2026-09-05T18:40:00.000Z',
      lastActiveLabel: 'Yesterday',
    },
    {
      id: 'grant-hassan',
      userId: USER_IDS.hassan,
      scope: 'restricted',
      propertyIds: [],
      entityIds: [],
      canSee: 'Training & travel budget · assigned tasks',
      canSeeNote: 'No sensitive totals',
      lastActiveAt: '2026-09-03T11:05:00.000Z',
      lastActiveLabel: '3 days ago',
    },
    {
      id: 'grant-kumar',
      userId: USER_IDS.accountant,
      scope: 'all',
      propertyIds: [],
      entityIds: [],
      canSee: 'Approved FY26 records & exports',
      canSeeNote: 'Grant expires 31 Oct 26',
      expiresOn: '2026-10-31',
      lastActiveAt: '2026-08-12T14:03:00.000Z',
      lastActiveLabel: '12 Aug',
    },
    {
      id: 'grant-keyob',
      userId: USER_IDS.operator,
      scope: 'restricted',
      propertyIds: [],
      entityIds: [],
      canSee: 'Deployment, monitoring, recovery',
      canSeeNote: 'No business data · audited exception only',
      lastActiveAt: '2026-09-01T02:10:00.000Z',
      lastActiveLabel: '1 Sep · backup restore test',
    },
  ];
}

export function seedAuditEvents(): readonly AuditEvent[] {
  return [
    {
      id: 'audit-1',
      at: '2026-09-06T08:51:00.000Z',
      actor: 'Jawad',
      summary: 'Bank import CSV staged (38 rows, 3 duplicates skipped)',
      context: 'Today 08:51 · Jawad · CBA Everyday',
      outcome: 'ok',
    },
    {
      id: 'audit-2',
      at: '2026-09-06T08:00:00.000Z',
      actor: 'system',
      summary: 'Reminder queued · Landlord insurance renewal · email',
      context: 'Today 08:00 · system · recipient verified',
      outcome: 'ok',
    },
    {
      id: 'audit-3',
      at: '2026-09-05T17:20:00.000Z',
      actor: 'Mahvish',
      summary: 'Water usage bill split changed 50/50 → 60/40',
      context: 'Yesterday 17:20 · Mahvish · agreement attached',
      outcome: 'ok',
    },
    {
      id: 'audit-4',
      at: '2026-09-01T08:00:00.000Z',
      actor: 'system',
      summary: 'Reminder failed · Body corporate levy · email bounce',
      context: '1 Sep 08:00 · system · owner task created for Jawad',
      outcome: 'failed',
    },
    {
      id: 'audit-5',
      at: '2026-08-12T14:03:00.000Z',
      actor: 'A. Kumar',
      summary: 'Export · FY26 expense register (permission-filtered)',
      context: '12 Aug 14:03 · A. Kumar',
      outcome: 'ok',
    },
    {
      id: 'audit-6',
      at: '2026-09-01T02:10:00.000Z',
      actor: 'KEYOB operator',
      summary: 'Restore test completed · 41,208 records reconciled',
      context: '1 Sep 02:10 · KEYOB operator',
      outcome: 'ok',
    },
  ];
}

export function seedContinuityPosture(): ContinuityPosture {
  return {
    emergencyContactName: 'Mahvish Gull',
    emergencyContactNote: 'Full access for 72 hours after approval · not yet activated',
    instructionsReviewedOn: '2026-06-14',
    instructionsNote: 'Quarterly review due 14 Sep · no raw passwords stored',
    backupsSummary: 'Daily · last 6 Sep 02:00',
    backupsNote: 'Encrypted · restore tested 1 Sep',
  };
}
