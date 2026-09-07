/**
 * Shared bills data access.
 */
import { createCollection } from '@/server/db/collection';
import type { PropertyId } from '@/shared/types/common';
import type { AllocationAgreement, BillShare, SharedBill } from './model';
import { seedAgreements, seedBillShares, seedSharedBills } from './data/seed';

const bills = createCollection<SharedBill>('sharedBills.bills', seedSharedBills);
const agreements = createCollection<AllocationAgreement>('sharedBills.agreements', seedAgreements);
const shares = createCollection<BillShare>('sharedBills.shares', seedBillShares);

export const sharedBillsRepository = {
  list: (): readonly SharedBill[] =>
    [...bills.list()].sort((a, b) => b.effectiveOn.localeCompare(a.effectiveOn)),
  find: (id: string): SharedBill | undefined => bills.find(id),
  listForProperty: (propertyId: PropertyId): readonly SharedBill[] =>
    bills.where((bill) => bill.propertyId === propertyId),

  findAgreement: (id: string): AllocationAgreement | undefined => agreements.find(id),
  /** Approved agreements for a property covering `onDate`, newest first. */
  listAgreementsForProperty: (propertyId: PropertyId): readonly AllocationAgreement[] =>
    [...agreements.where((agreement) => agreement.propertyId === propertyId)].sort((a, b) =>
      b.effectiveFrom.localeCompare(a.effectiveFrom),
    ),

  listShares: (billId: string): readonly BillShare[] => shares.where((share) => share.billId === billId),
  updateShare: (id: string, changes: Partial<Omit<BillShare, 'id'>>): BillShare | undefined =>
    shares.update(id, changes),
};
