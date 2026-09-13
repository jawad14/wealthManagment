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
import { LOAN_IDS } from '@/modules/loans/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import { OBLIGATION_IDS } from '@/modules/obligations/data/seed';
import { BILL_IDS } from '@/modules/shared-bills/data/seed';
import type { Expense, ExpenseCategory } from '../model';

/**
 * Routine operating expenses across the reporting period.
 *
 * Generated deterministically from the real properties and categories so the
 * category breakdown, the period filters and the FR-09 drill-down all have
 * something substantial to show. Every row carries an allocation, a source and
 * an effective date distinct from when it was posted (BR-06).
 */
function routineExpenses(): Expense[] {
  const rows: Expense[] = [];

  const add = (
    id: string,
    amount: number,
    category: ExpenseCategory,
    effectiveOn: string,
    description: string,
    entityId: (typeof ENTITY_IDS)[keyof typeof ENTITY_IDS],
    propertyId: (typeof PROPERTY_IDS)[keyof typeof PROPERTY_IDS] | undefined,
    recordedBy: (typeof USER_IDS)[keyof typeof USER_IDS],
    basis: 'actual' | 'forecast' | 'estimated' = 'actual',
    evidence: readonly string[] = [],
    loanId?: (typeof LOAN_IDS)[keyof typeof LOAN_IDS],
  ): void => {
    rows.push({
      id,
      source: { kind: 'manual', enteredBy: recordedBy },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(amount),
          category,
          effectiveOn,
          allocation: { entityId, ...(propertyId ? { propertyId } : {}), ...(loanId ? { loanId } : {}) },
          basis,
          description,
          // Posted a few days after the cost was incurred, as in practice.
          postedAt: `${effectiveOn}T09:30:00.000Z`,
          recordedBy,
        },
      ],
      evidenceDocumentIds: evidence.map((id) => asId<'Document'>(id)),
    });
  };

  const months = ['03', '04', '05', '06', '07', '08'];

  // Loan interest — the largest recurring cost, and the one BR-03 keeps out of
  // the cash-flow principal figure.
  months.forEach((month) => {
    add(`exp-interest-macq-${month}`, 3_006, 'loan-interest', `2026-${month}-01`,
      'Interest · Macquarie 4417', ENTITY_IDS.adam, PROPERTY_IDS.calderRd, USER_IDS.adam,
      'actual', [`doc-loan-${LOAN_IDS.macquarie4417}-2026-06-30`], LOAN_IDS.macquarie4417);
    add(`exp-interest-cba-${month}`, 6_250, 'loan-interest', `2026-${month}-01`,
      'Interest · CBA 8820', ENTITY_IDS.northgate, PROPERTY_IDS.marlinSt, USER_IDS.adam,
      'actual', [`doc-loan-${LOAN_IDS.cba8820}-2026-06-30`], LOAN_IDS.cba8820);
  });

  // Management fees on the agent-managed property.
  months.forEach((month) => {
    add(`exp-mgmt-marlin-${month}`, 418, 'management', `2026-${month}-15`,
      'Management fee · 8 Marlin St', ENTITY_IDS.northgate, PROPERTY_IDS.marlinSt, USER_IDS.adam);
  });

  // Quarterly council rates.
  [
    { month: '03', property: PROPERTY_IDS.harlowRd, slug: 'harlow', label: '14 Harlow Rd', entity: ENTITY_IDS.familyTrust, amount: 1_180 },
    { month: '06', property: PROPERTY_IDS.harlowRd, slug: 'harlow', label: '14 Harlow Rd', entity: ENTITY_IDS.familyTrust, amount: 1_180 },
    { month: '03', property: PROPERTY_IDS.marlinSt, slug: 'marlin', label: '8 Marlin St', entity: ENTITY_IDS.northgate, amount: 1_245 },
    { month: '06', property: PROPERTY_IDS.marlinSt, slug: 'marlin', label: '8 Marlin St', entity: ENTITY_IDS.northgate, amount: 1_245 },
    { month: '04', property: PROPERTY_IDS.vernonRd, slug: 'vernon', label: 'Vernon Rd', entity: ENTITY_IDS.familyTrust, amount: 940 },
    { month: '07', property: PROPERTY_IDS.vernonRd, slug: 'vernon', label: 'Vernon Rd', entity: ENTITY_IDS.familyTrust, amount: 940 },
  ].forEach((entry, index) => {
    add(`exp-rates-${index}`, entry.amount, 'rates', `2026-${entry.month}-12`,
      `Council rates · ${entry.label}`, entry.entity, entry.property, USER_IDS.nadia,
      'actual', [`doc-rates-${entry.slug}-2026-Q3`]);
  });

  // Insurance instalments.
  months.forEach((month) => {
    add(`exp-insurance-harlow-${month}`, 155, 'insurance', `2026-${month}-05`,
      'Landlord insurance instalment · 14 Harlow Rd', ENTITY_IDS.familyTrust, PROPERTY_IDS.harlowRd,
      USER_IDS.adam, 'actual', ['doc-insurance-harlow-2026']);
  });

  // Body corporate levies.
  ['03', '06'].forEach((month) => {
    add(`exp-strata-${month}`, 1_120, 'body-corporate', `2026-${month}-01`,
      'Body corporate levy · Calder Rd', ENTITY_IDS.adam, PROPERTY_IDS.calderRd, USER_IDS.adam);
  });

  // Repairs and maintenance.
  [
    { slug: 'plumb', evidence: ['doc-maint-plumb-harlow'], amount: 486.2, month: '07', day: '04', label: 'Plumbing · leaking cistern Room 2', property: PROPERTY_IDS.harlowRd, entity: ENTITY_IDS.familyTrust },
    { slug: 'elec', evidence: ['doc-maint-elec-marlin'], amount: 312.0, month: '06', day: '19', label: 'Electrical · switchboard repair', property: PROPERTY_IDS.marlinSt, entity: ENTITY_IDS.northgate },
    { slug: 'garden', evidence: ['doc-maint-garden-vernon'], amount: 180.0, month: '05', day: '30', label: 'Gardening · quarterly tidy', property: PROPERTY_IDS.vernonRd, entity: ENTITY_IDS.familyTrust },
    { slug: 'locks', evidence: ['doc-maint-locks-harlow'], amount: 240.0, month: '05', day: '12', label: 'Locksmith · rekey after tenancy', property: PROPERTY_IDS.harlowRd, entity: ENTITY_IDS.familyTrust },
    { slug: 'roof', evidence: ['doc-maint-roof-calder'], amount: 1_450.0, month: '03', day: '15', label: 'Roof repair · storm damage', property: PROPERTY_IDS.calderRd, entity: ENTITY_IDS.adam },
    { slug: 'fence', evidence: ['doc-maint-fence-marlin'], amount: 890.0, month: '04', day: '19', label: 'Boundary fence replacement', property: PROPERTY_IDS.marlinSt, entity: ENTITY_IDS.northgate },
    { slug: 'paint', evidence: ['doc-maint-paint-vernon'], amount: 2_300.0, month: '04', day: '28', label: 'Interior repaint before reletting', property: PROPERTY_IDS.vernonRd, entity: ENTITY_IDS.familyTrust },
  ].forEach((entry) => {
    add(`exp-repair-${entry.slug}`, entry.amount, 'repairs', `2026-${entry.month}-${entry.day}`,
      entry.label, entry.entity, entry.property, USER_IDS.nadia, 'actual', entry.evidence);
  });

  // Compliance and professional services.
  add('exp-compliance-smoke', 180, 'compliance', '2026-07-22',
    'Smoke alarm compliance · 8 Marlin St', ENTITY_IDS.northgate, PROPERTY_IDS.marlinSt, USER_IDS.nadia,
    'actual', ['doc-compliance-smoke-marlin']);
  add('exp-compliance-pest', 395, 'compliance', '2026-08-13',
    'Pest control · 8 Marlin St', ENTITY_IDS.northgate, PROPERTY_IDS.marlinSt, USER_IDS.nadia,
    'actual', ['doc-maint-pest-marlin']);
  add('exp-professional-accounting', 2_400, 'professional', '2026-06-30',
    'Accounting · FY26 preparation', ENTITY_IDS.northgate, undefined, USER_IDS.adam);
  add('exp-professional-conveyancing', 1_650, 'professional', '2026-03-22',
    'Conveyancing · Lot 12 settlement advice', ENTITY_IDS.northgate, PROPERTY_IDS.fairmontReserve, USER_IDS.adam);

  // An estimated figure, so the "not actual" filter has something to show.
  add('exp-other-estimated-utilities', 240, 'other', '2026-08-31',
    'Estimated common-area water · awaiting bill', ENTITY_IDS.familyTrust, PROPERTY_IDS.vernonRd,
    USER_IDS.nadia, 'estimated');

  return rows;
}

export function seedExpenses(): readonly Expense[] {
  return [
    ...routineExpenses(),
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
          allocation: { entityId: ENTITY_IDS.familyTrust, propertyId: PROPERTY_IDS.harlowRd },
          basis: 'actual',
          description: 'Water usage · Rooms 1–3 (50/50 split)',
          postedAt: '2026-08-25T16:10:00.000Z',
          recordedBy: USER_IDS.nadia,
        },
        {
          version: 2,
          amount: fromMajorUnits(247.2),
          category: 'utilities',
          effectiveOn: '2026-08-31',
          allocation: { entityId: ENTITY_IDS.familyTrust, propertyId: PROPERTY_IDS.harlowRd },
          basis: 'actual',
          description: 'Water usage · Rooms 1–3 (60/40 split)',
          postedAt: '2026-09-05T17:20:00.000Z',
          recordedBy: USER_IDS.nadia,
          correctionReason: 'Split changed 50/50 → 60/40 per signed agreement',
        },
      ],
      evidenceDocumentIds: [asId<'Document'>('doc-urban-utilities')],
    },
    {
      id: 'exp-insurance-marlin',
      source: { kind: 'obligation', obligationId: OBLIGATION_IDS.insuranceMarlin },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(1_710),
          category: 'insurance',
          effectiveOn: '2026-08-01',
          allocation: { entityId: ENTITY_IDS.northgate, propertyId: PROPERTY_IDS.marlinSt },
          basis: 'actual',
          description: 'Landlord insurance renewal · 8 Marlin St',
          postedAt: '2026-08-01T10:00:00.000Z',
          recordedBy: USER_IDS.adam,
        },
      ],
      evidenceDocumentIds: [],
    },
    {
      id: 'exp-management-marlin',
      source: { kind: 'bank-transaction', transactionId: 'txn-agent-0815' },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(418),
          category: 'management',
          effectiveOn: '2026-08-15',
          allocation: { entityId: ENTITY_IDS.northgate, propertyId: PROPERTY_IDS.marlinSt },
          basis: 'actual',
          description: 'Management fee · 8 Marlin St',
          postedAt: '2026-09-04T09:00:00.000Z',
          recordedBy: USER_IDS.adam,
        },
      ],
      evidenceDocumentIds: [],
    },
    {
      id: 'exp-rates-marlin',
      source: { kind: 'bank-transaction', transactionId: 'txn-council-0812' },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(311.25),
          category: 'rates',
          effectiveOn: '2026-08-12',
          allocation: { entityId: ENTITY_IDS.northgate, propertyId: PROPERTY_IDS.marlinSt },
          basis: 'actual',
          description: 'Council rates instalment · 8 Marlin St',
          postedAt: '2026-09-04T09:00:00.000Z',
          recordedBy: USER_IDS.adam,
        },
      ],
      evidenceDocumentIds: [],
    },
    {
      id: 'exp-electricity-harlow',
      source: { kind: 'shared-bill', billId: BILL_IDS.energexAug, shareId: 'share-energex-rooms-1-3' },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(186.4),
          category: 'utilities',
          effectiveOn: '2026-08-31',
          allocation: { entityId: ENTITY_IDS.familyTrust, propertyId: PROPERTY_IDS.harlowRd },
          basis: 'actual',
          description: 'Electricity · common areas',
          postedAt: '2026-09-04T09:10:00.000Z',
          recordedBy: USER_IDS.adam,
        },
      ],
      evidenceDocumentIds: [],
    },
    {
      // Voided: entered against the wrong property, corrected by a new record.
      // Kept so the audit history stays complete.
      id: 'exp-repairs-misfiled',
      source: { kind: 'manual', enteredBy: USER_IDS.nadia },
      revisions: [
        {
          version: 1,
          amount: fromMajorUnits(286.4),
          category: 'repairs',
          effectiveOn: '2026-08-22',
          allocation: { entityId: ENTITY_IDS.familyTrust, propertyId: PROPERTY_IDS.vernonRd },
          basis: 'estimated',
          description: 'Hardware purchase · property to be confirmed',
          postedAt: '2026-08-23T08:00:00.000Z',
          recordedBy: USER_IDS.nadia,
        },
      ],
      evidenceDocumentIds: [],
      voidedAt: '2026-09-02T10:15:00.000Z',
      voidedBy: USER_IDS.adam,
      voidReason: 'Property could not be determined; awaiting allocation from the bank import',
    },
  ];
}
