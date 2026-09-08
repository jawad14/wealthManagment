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

/**
 * Earlier audit history.
 *
 * NFR-03 requires edits, approvals, grants, exports and notification events to
 * be logged with actor, time and affected record. A log holding six entries
 * cannot demonstrate that; this is the trail a working month leaves behind.
 */
function priorAuditEvents(): AuditEvent[] {
  const entries: readonly (readonly [string, string, string, string, 'ok' | 'failed'])[] = [
    ['2026-09-05T17:22:00.000Z', 'Mahvish', 'Expense corrected · Water usage · Rooms 1–3', 'v1 → v2 · split changed 50/50 → 60/40 per signed agreement', 'ok'],
    ['2026-09-05T16:40:00.000Z', 'Jawad', 'Allocation agreement approved · 60/40 water split', '166 Compton Rd · signed agreement attached', 'ok'],
    ['2026-09-04T09:12:00.000Z', 'Jawad', 'Bank import staged · CBA Everyday', '38 rows · 1–31 Aug 2026', 'ok'],
    ['2026-09-03T08:20:00.000Z', 'Mahvish', 'Document uploaded · Scan_20260903_0007.pdf', 'Not linked to any record', 'ok'],
    ['2026-09-02T10:15:00.000Z', 'Jawad', 'Expense voided · Hardware purchase', 'Property could not be determined · record retained', 'ok'],
    ['2026-09-02T08:20:00.000Z', 'Mahvish', 'Document uploaded · IMG_4471.jpg', 'Photo of receipt · awaiting link', 'ok'],
    ['2026-09-01T14:05:00.000Z', 'Jawad', 'Obligation created · Portfolio insurance review', 'Owner assigned · eligible for reminders', 'ok'],
    ['2026-08-31T09:00:00.000Z', 'system', 'Rent charges generated · 6 active leases', 'Week commencing 31 Aug', 'ok'],
    ['2026-08-29T11:30:00.000Z', 'Mahvish', 'Receipt allocated · R. Patel $690', 'Partial payment against charge 28 Aug', 'ok'],
    ['2026-08-28T16:44:00.000Z', 'Mahvish', 'Receipt allocated · A. Nguyen $300', 'Partial payment · $200 remains', 'ok'],
    ['2026-08-27T08:00:00.000Z', 'system', 'Reminder sent · Water usage · shared bill · email', 'Recipient verified · Mahvish', 'ok'],
    ['2026-08-25T16:04:00.000Z', 'Mahvish', 'Document uploaded · Urban Utilities bill 4471', 'Linked to Water usage · shared bill', 'ok'],
    ['2026-08-24T10:10:00.000Z', 'Mahvish', 'Lease ended · Room 6, 166 Compton Rd', 'Vacated 24 Aug · no arrears outstanding', 'ok'],
    ['2026-08-23T08:00:00.000Z', 'system', 'Reminder sent · Council rates Q1 · email', 'Recipient verified · Mahvish', 'ok'],
    ['2026-08-20T09:15:00.000Z', 'Jawad', 'Obligation validated · Landlord insurance renewal', '166 Compton Rd · eligible for reminders', 'ok'],
    ['2026-08-19T13:47:00.000Z', 'Jawad', 'Document uploaded · CBA bank valuation Compton Rd', 'Linked to valuation 18 Aug 26', 'ok'],
    ['2026-08-18T11:02:00.000Z', 'Jawad', 'Valuation recorded · 166 Compton Rd $1,180,000', 'Bank valuation · confidence high', 'ok'],
    ['2026-08-14T09:30:00.000Z', 'system', 'Reminder failed · Pest control · 20 Benton St · email', 'Temporary delivery failure · retried successfully', 'failed'],
    ['2026-08-13T15:20:00.000Z', 'Mahvish', 'Payment evidence attached · Pest control', '20 Benton St · marked paid 13 Aug', 'ok'],
    ['2026-08-10T10:00:00.000Z', 'Jawad', 'Access grant reviewed · A. Kumar, CPA', 'Read-only · expires 31 Oct 26', 'ok'],
    ['2026-08-05T08:45:00.000Z', 'Jawad', 'Loan balance updated · Macquarie 4417', 'Statement 31 Jul 2026', 'ok'],
    ['2026-07-22T14:00:00.000Z', 'Mahvish', 'Payment evidence attached · Smoke alarm compliance', '20 Benton St · certificate attached', 'ok'],
  ];

  return entries.map(([at, actor, summary, context, outcome], index) => ({
    id: `audit-prior-${index}`,
    at,
    actor,
    summary,
    context: `${context}`,
    outcome,
  }));
}

export function seedAuditEvents(): readonly AuditEvent[] {
  return [
    ...priorAuditEvents(),
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
