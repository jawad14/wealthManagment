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

export function seedSharedBills(): readonly SharedBill[] {
  return [
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
      agreementId: AGREEMENT_IDS.comptonWater6040,
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
export function seedBillShares(): readonly BillShare[] {
  const zero = fromMajorUnits(0);
  return [
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
