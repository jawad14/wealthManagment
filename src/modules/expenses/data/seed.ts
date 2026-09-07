/**
 * Seeded expenses.
 *
 * Includes one corrected expense (the water bill split changed from 50/50 to
 * 60/40, matching the design's audit log entry) and one voided expense, so the
 * versioning and void behaviours are exercised by the seeded dataset rather than
 * only by tests.
 */
import { fromMajorUnits } from '@/shared/lib/money';
import { asId } from '@/shared/types/common';
import { ENTITY_IDS, PROPERTY_IDS } from '@/modules/entities/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import { OBLIGATION_IDS } from '@/modules/obligations/data/seed';
import { BILL_IDS } from '@/modules/shared-bills/data/seed';
import type { Expense } from '../model';

export function seedExpenses(): readonly Expense[] {
  return [
    {
      // Corrected twice: the allocation basis changed after the agreement was
      // renegotiated. Both versions remain readable.
      id: 'exp-water-aug',
      source: { kind: 'shared-bill', billId: BILL_IDS.urbanUtilitiesAug, shareId: 'share-uu-rooms-1-3' },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(206),
          category: 'utilities',
          effectiveOn: '2026-08-31',
          allocation: { entityId: ENTITY_IDS.familyTrust, propertyId: PROPERTY_IDS.comptonRd },
          basis: 'actual',
          description: 'Water usage · Rooms 1–3 (50/50 split)',
          postedAt: '2026-08-25T16:10:00.000Z',
          recordedBy: USER_IDS.mahvish,
        },
        {
          version: 2,
          amount: fromMajorUnits(247.2),
          category: 'utilities',
          effectiveOn: '2026-08-31',
          allocation: { entityId: ENTITY_IDS.familyTrust, propertyId: PROPERTY_IDS.comptonRd },
          basis: 'actual',
          description: 'Water usage · Rooms 1–3 (60/40 split)',
          postedAt: '2026-09-05T17:20:00.000Z',
          recordedBy: USER_IDS.mahvish,
          correctionReason: 'Split changed 50/50 → 60/40 per signed agreement',
        },
      ],
      evidenceDocumentIds: [asId<'Document'>('doc-urban-utilities')],
    },
    {
      id: 'exp-insurance-benton',
      source: { kind: 'obligation', obligationId: OBLIGATION_IDS.insuranceBenton },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(1_710),
          category: 'insurance',
          effectiveOn: '2026-08-01',
          allocation: { entityId: ENTITY_IDS.esteem, propertyId: PROPERTY_IDS.bentonSt },
          basis: 'actual',
          description: 'Landlord insurance renewal · 20 Benton St',
          postedAt: '2026-08-01T10:00:00.000Z',
          recordedBy: USER_IDS.jawad,
        },
      ],
      evidenceDocumentIds: [],
    },
    {
      id: 'exp-management-benton',
      source: { kind: 'bank-transaction', transactionId: 'txn-agent-0815' },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(418),
          category: 'management',
          effectiveOn: '2026-08-15',
          allocation: { entityId: ENTITY_IDS.esteem, propertyId: PROPERTY_IDS.bentonSt },
          basis: 'actual',
          description: 'Management fee · 20 Benton St',
          postedAt: '2026-09-04T09:00:00.000Z',
          recordedBy: USER_IDS.jawad,
        },
      ],
      evidenceDocumentIds: [],
    },
    {
      id: 'exp-rates-benton',
      source: { kind: 'bank-transaction', transactionId: 'txn-council-0812' },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(311.25),
          category: 'rates',
          effectiveOn: '2026-08-12',
          allocation: { entityId: ENTITY_IDS.esteem, propertyId: PROPERTY_IDS.bentonSt },
          basis: 'actual',
          description: 'Council rates instalment · 20 Benton St',
          postedAt: '2026-09-04T09:00:00.000Z',
          recordedBy: USER_IDS.jawad,
        },
      ],
      evidenceDocumentIds: [],
    },
    {
      id: 'exp-electricity-compton',
      source: { kind: 'shared-bill', billId: BILL_IDS.energexAug, shareId: 'share-energex-rooms-1-3' },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(186.4),
          category: 'utilities',
          effectiveOn: '2026-08-31',
          allocation: { entityId: ENTITY_IDS.familyTrust, propertyId: PROPERTY_IDS.comptonRd },
          basis: 'actual',
          description: 'Electricity · common areas',
          postedAt: '2026-09-04T09:10:00.000Z',
          recordedBy: USER_IDS.jawad,
        },
      ],
      evidenceDocumentIds: [],
    },
    {
      // Voided: entered against the wrong property, corrected by a new record.
      // Kept so the audit history stays complete.
      id: 'exp-repairs-misfiled',
      source: { kind: 'manual', enteredBy: USER_IDS.mahvish },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(286.4),
          category: 'repairs',
          effectiveOn: '2026-08-22',
          allocation: { entityId: ENTITY_IDS.familyTrust, propertyId: PROPERTY_IDS.miansRd },
          basis: 'estimated',
          description: 'Hardware purchase · property to be confirmed',
          postedAt: '2026-08-23T08:00:00.000Z',
          recordedBy: USER_IDS.mahvish,
        },
      ],
      evidenceDocumentIds: [],
      voidedAt: '2026-09-02T10:15:00.000Z',
      voidedBy: USER_IDS.jawad,
      voidReason: 'Property could not be determined; awaiting allocation from the bank import',
    },
  ];
}
