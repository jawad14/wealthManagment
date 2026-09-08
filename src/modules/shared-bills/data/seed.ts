/**
 * Seeded shared bills and allocation agreements.
 *
 * The Urban Utilities bill reproduces the design prototype's example: a water
 * bill split 60/40 across the two room groups at 166 Compton Rd, with the
 * agreement attached. The audit log in the design records this split being
 * changed from 50/50 to 60/40, so the superseded agreement is seeded too.
 */
import { fromMajorUnits } from '@/shared/lib/money';
import { asId } from '@/shared/types/common';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import { LEASE_IDS } from '@/modules/leases/data/seed';
import type { AllocationAgreement, BillShare, SharedBill } from '../model';

export const AGREEMENT_IDS = {
  comptonWater5050: 'agr-compton-water-50-50',
  comptonWater6040: 'agr-compton-water-60-40',
  bentonWater: 'agr-benton-water',
  comptonElectricity: 'agr-compton-electricity',
};

export const BILL_IDS = {
  urbanUtilitiesAug: 'bill-urban-utilities-4471',
  energexAug: 'bill-energex-7741',
  bentonWaterJul: 'bill-benton-water-jul',
};

export function seedAgreements(): readonly AllocationAgreement[] {
  return [
    {
      // Superseded on 5 Sep — kept, because history must remain inspectable.
      id: AGREEMENT_IDS.comptonWater5050,
      propertyId: PROPERTY_IDS.comptonRd,
      basis: 'percentage',
      description: '50/50 to Rooms 1–3 and Rooms 4–6',
      approved: true,
      approvedOn: '2025-02-01',
      effectiveFrom: '2025-02-01',
      effectiveTo: '2026-06-30',
    },
    {
      id: AGREEMENT_IDS.comptonWater6040,
      propertyId: PROPERTY_IDS.comptonRd,
      basis: 'percentage',
      description: '60/40 to Rooms 1–3 and Rooms 4–6 per agreement',
      approved: true,
      approvedOn: '2026-09-05',
      documentId: asId<'Document'>('doc-water-agreement'),
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
    },
    {
      // Common-area power is the owner's cost and always has been, so this one
      // stands apart from the room-group water split.
      id: AGREEMENT_IDS.comptonElectricity,
      propertyId: PROPERTY_IDS.comptonRd,
      basis: 'percentage',
      description: '100% owner · common areas',
      approved: true,
      approvedOn: '2024-01-01',
      effectiveFrom: '2024-01-01',
      effectiveTo: null,
    },
    {
      // Present but unapproved — demonstrates a bill that cannot be split yet.
      id: AGREEMENT_IDS.bentonWater,
      propertyId: PROPERTY_IDS.bentonSt,
      basis: 'percentage',
      description: '100% recoverable from the whole-property tenant',
      approved: false,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    },
  ];
}

/**
 * Earlier periods of the same recurring bills, so the register shows a run of
 * history rather than a single month. Each carries the agreement that was in
 * force for its own effective date, which is what lets the 50/50 → 60/40 change
 * be seen in the data rather than only in the audit log.
 */
function priorPeriodBills(): SharedBill[] {
  const rows: SharedBill[] = [];

  const water = [
    { period: ['2026-05-01', '2026-06-30'], due: '2026-07-01', effective: '2026-06-30', total: 388, ref: '4470', agreement: AGREEMENT_IDS.comptonWater5050, reviewed: '2026-07-02' },
    { period: ['2026-03-01', '2026-04-30'], due: '2026-05-01', effective: '2026-04-30', total: 401.5, ref: '4469', agreement: AGREEMENT_IDS.comptonWater5050, reviewed: '2026-05-03' },
    { period: ['2026-01-01', '2026-02-28'], due: '2026-03-01', effective: '2026-02-28', total: 372.8, ref: '4468', agreement: AGREEMENT_IDS.comptonWater5050, reviewed: '2026-03-04' },
  ];
  water.forEach((entry, index) => {
    rows.push({
      id: `bill-uu-prior-${index}`,
      propertyId: PROPERTY_IDS.comptonRd,
      category: 'water',
      supplier: 'Urban Utilities',
      reference: entry.ref,
      total: fromMajorUnits(entry.total),
      periodFrom: entry.period[0] as string,
      periodTo: entry.period[1] as string,
      dueOn: entry.due,
      effectiveOn: entry.effective,
      postedAt: `${entry.due}T10:00:00.000Z`,
      basisAmount: 'actual',
      agreementId: entry.agreement,
      recoveryReviewedOn: entry.reviewed,
      recoveryDeadline: null,
    });
  });

  const electricity = [
    { month: '06', total: 204.1 },
    { month: '04', total: 231.75 },
    { month: '02', total: 198.6 },
  ];
  electricity.forEach((entry) => {
    rows.push({
      id: `bill-energex-2026-${entry.month}`,
      propertyId: PROPERTY_IDS.comptonRd,
      category: 'electricity',
      supplier: 'Energex Retail',
      reference: '7741',
      total: fromMajorUnits(entry.total),
      periodFrom: `2026-${entry.month}-01`,
      periodTo: `2026-${entry.month}-28`,
      dueOn: `2026-${entry.month}-25`,
      effectiveOn: `2026-${entry.month}-28`,
      postedAt: `2026-${entry.month}-26T10:00:00.000Z`,
      basisAmount: 'actual',
      agreementId: AGREEMENT_IDS.comptonElectricity,
      recoveryReviewedOn: `2026-${entry.month}-27`,
      recoveryDeadline: null,
    });
  });

  // A bill with no agreement at all — distinct from one whose agreement is
  // merely unapproved, and shown as a different blocking reason.
  rows.push({
    id: 'bill-internet-mians',
    propertyId: PROPERTY_IDS.miansRd,
    category: 'internet',
    supplier: 'Aussie Broadband',
    reference: 'AB-99120',
    total: fromMajorUnits(89),
    periodFrom: '2026-08-01',
    periodTo: '2026-08-31',
    dueOn: '2026-09-10',
    effectiveOn: '2026-08-31',
    postedAt: '2026-09-02T10:00:00.000Z',
    basisAmount: 'actual',
    agreementId: null,
    recoveryReviewedOn: null,
    recoveryDeadline: null,
  });

  // Cleaning, split equally between the two room groups.
  rows.push({
    id: 'bill-cleaning-compton',
    propertyId: PROPERTY_IDS.comptonRd,
    category: 'cleaning',
    supplier: 'Bright Spaces Cleaning',
    reference: 'BSC-2208',
    total: fromMajorUnits(320),
    periodFrom: '2026-08-01',
    periodTo: '2026-08-31',
    dueOn: '2026-09-12',
    effectiveOn: '2026-08-31',
    postedAt: '2026-09-03T10:00:00.000Z',
    basisAmount: 'actual',
    agreementId: AGREEMENT_IDS.comptonWater6040,
    recoveryReviewedOn: null,
    recoveryDeadline: '2026-11-30',
  });

  return rows;
}

export function seedSharedBills(): readonly SharedBill[] {
  return [
    ...priorPeriodBills(),
    {
      id: BILL_IDS.urbanUtilitiesAug,
      propertyId: PROPERTY_IDS.comptonRd,
      category: 'water',
      supplier: 'Urban Utilities',
      reference: '4471',
      total: fromMajorUnits(412),
      periodFrom: '2026-07-01',
      periodTo: '2026-08-31',
      dueOn: '2026-08-28',
      effectiveOn: '2026-08-31',
      postedAt: '2026-08-25T16:04:00.000Z',
      basisAmount: 'actual',
      agreementId: AGREEMENT_IDS.comptonWater6040,
      sourceDocumentId: asId<'Document'>('doc-urban-utilities'),
      recoveryReviewedOn: '2026-08-26',
      recoveryDeadline: null,
    },
    {
      id: BILL_IDS.energexAug,
      propertyId: PROPERTY_IDS.comptonRd,
      category: 'electricity',
      supplier: 'Energex Retail',
      reference: '7741',
      total: fromMajorUnits(186.4),
      periodFrom: '2026-07-01',
      periodTo: '2026-08-31',
      dueOn: '2026-09-15',
      effectiveOn: '2026-08-31',
      postedAt: '2026-09-04T09:10:00.000Z',
      basisAmount: 'actual',
      agreementId: AGREEMENT_IDS.comptonElectricity,
      // Not yet reviewed — distinct from "reviewed and found not recoverable".
      recoveryReviewedOn: null,
      recoveryDeadline: null,
    },
    {
      id: BILL_IDS.bentonWaterJul,
      propertyId: PROPERTY_IDS.bentonSt,
      category: 'water',
      supplier: 'Urban Utilities',
      total: fromMajorUnits(214.5),
      periodFrom: '2026-06-01',
      periodTo: '2026-07-31',
      dueOn: '2026-08-20',
      effectiveOn: '2026-07-31',
      postedAt: '2026-08-14T11:00:00.000Z',
      basisAmount: 'actual',
      agreementId: AGREEMENT_IDS.bentonWater,
      recoveryReviewedOn: null,
      recoveryDeadline: null,
    },
  ];
}

/**
 * Explicit share definitions.
 *
 * Weights are percentages under the `percentage` basis. The resolved `amount`
 * is recomputed by the service from the bill total, so a stored amount can never
 * drift from the bill it belongs to.
 */
/** Share definitions for the generated bills, mirroring the featured ones. */
function priorPeriodShares(): BillShare[] {
  const zero = fromMajorUnits(0);
  const rows: BillShare[] = [];

  const splitAcrossRoomGroups = (billId: string, firstWeight: number, secondWeight: number): void => {
    rows.push(
      { id: `share-${billId}-a`, billId, leaseId: LEASE_IDS.okaforR1, label: 'Rooms 1–3', weight: firstWeight, amount: zero, recoverable: true },
      { id: `share-${billId}-b`, billId, leaseId: LEASE_IDS.williamsR4, label: 'Rooms 4–6', weight: secondWeight, amount: zero, recoverable: true },
    );
  };

  // Prior water bills ran under the superseded 50/50 agreement.
  [0, 1, 2].forEach((index) => splitAcrossRoomGroups(`bill-uu-prior-${index}`, 50, 50));

  // Electricity stays with the owner: it powers common areas.
  ['06', '04', '02'].forEach((month) => {
    const billId = `bill-energex-2026-${month}`;
    rows.push({
      id: `share-${billId}-owner`,
      billId,
      leaseId: null,
      label: 'Owner · common areas',
      weight: 100,
      amount: zero,
      recoverable: false,
    });
  });

  splitAcrossRoomGroups('bill-cleaning-compton', 60, 40);

  rows.push({
    id: 'share-internet-mians',
    billId: 'bill-internet-mians',
    leaseId: null,
    label: 'Owner · vacant period',
    weight: 100,
    amount: zero,
    recoverable: false,
  });

  return rows;
}

export function seedBillShares(): readonly BillShare[] {
  const zero = fromMajorUnits(0);
  return [
    ...priorPeriodShares(),
    {
      id: 'share-uu-rooms-1-3',
      billId: BILL_IDS.urbanUtilitiesAug,
      leaseId: LEASE_IDS.okaforR1,
      label: 'Rooms 1–3',
      weight: 60,
      amount: zero,
      recoverable: true,
    },
    {
      id: 'share-uu-rooms-4-6',
      billId: BILL_IDS.urbanUtilitiesAug,
      leaseId: LEASE_IDS.williamsR4,
      label: 'Rooms 4–6',
      weight: 40,
      amount: zero,
      recoverable: true,
    },
    {
      id: 'share-energex-rooms-1-3',
      billId: BILL_IDS.energexAug,
      leaseId: null,
      label: 'Owner · common areas',
      weight: 100,
      amount: zero,
      recoverable: false,
    },
    {
      id: 'share-benton-whole',
      billId: BILL_IDS.bentonWaterJul,
      leaseId: LEASE_IDS.patelBenton,
      label: 'Whole property',
      weight: 100,
      amount: zero,
      recoverable: true,
    },
  ];
}
