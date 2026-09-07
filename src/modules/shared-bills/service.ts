/**
 * Shared bills business logic (FR-07).
 *
 * The allocation is *always recomputed* from the bill total and the share
 * weights — stored amounts are a cache, never the truth. That is what makes the
 * acceptance criterion hold: a $200 bill split 60/40 produces exactly $120 and
 * $80, and an invalid allocation is rejected rather than silently adjusted.
 */
import { NotFoundError, PolicyRequiredError, ValidationError } from '@/shared/lib/errors';
import { allocateMoney, money, subtractMoney, sumMoney, type Money } from '@/shared/lib/money';
import { isWithin } from '@/shared/lib/dates';
import type { IsoDate, LeaseId, PropertyId } from '@/shared/types/common';
import { propertiesService } from '@/modules/properties/service';
import { sharedBillsRepository } from './repository';
import {
  type AllocationAgreement,
  type AllocationRejection,
  type BillAllocation,
  type BillShare,
  type SharedBill,
} from './model';

export type SharedBillFilter = 'all' | 'recoverable' | 'owner-cost' | 'needs-review' | 'blocked';

export const sharedBillsService = {
  list(): readonly SharedBill[] {
    return sharedBillsRepository.list();
  },

  require(id: string): SharedBill {
    const bill = sharedBillsRepository.find(id);
    if (!bill) throw new NotFoundError('Shared bill', id);
    return bill;
  },

  /**
   * The agreement governing a bill, if one is approved and in force for the
   * bill's effective date. Returns the reason instead when it is not.
   */
  resolveAgreement(bill: SharedBill): { agreement: AllocationAgreement | null; rejection: AllocationRejection | null } {
    if (!bill.agreementId) return { agreement: null, rejection: 'no-agreement' };

    const agreement = sharedBillsRepository.findAgreement(bill.agreementId);
    if (!agreement) return { agreement: null, rejection: 'no-agreement' };
    if (!agreement.approved) return { agreement, rejection: 'agreement-not-approved' };
    if (!isWithin(bill.effectiveOn, agreement.effectiveFrom, agreement.effectiveTo)) {
      return { agreement, rejection: 'agreement-not-effective' };
    }
    return { agreement, rejection: null };
  },

  /**
   * Resolve a bill into its shares.
   *
   * Amounts are derived with `allocateMoney`, so the parts sum to the bill total
   * exactly (BR-06). Where no approved agreement applies, the whole bill falls to
   * the owner and the rejection reason is returned for display — the platform
   * does not guess a split.
   */
  allocate(billId: string): BillAllocation {
    const bill = sharedBillsService.require(billId);
    const { agreement, rejection } = sharedBillsService.resolveAgreement(bill);
    const definitions = sharedBillsRepository.listShares(billId);

    if (rejection !== null || agreement === null) {
      return {
        bill,
        agreement,
        shares: [],
        recovered: money(0, bill.total.currency),
        ownerExpense: bill.total,
        rejection: rejection ?? 'no-agreement',
      };
    }

    if (definitions.length === 0) {
      return {
        bill,
        agreement,
        shares: [],
        recovered: money(0, bill.total.currency),
        ownerExpense: bill.total,
        rejection: 'no-active-leases',
      };
    }

    const weights =
      agreement.basis === 'equal'
        ? definitions.map(() => 1)
        : definitions.map((definition) => definition.weight);

    const amounts = allocateMoney(bill.total, weights);

    const shares: BillShare[] = definitions.map((definition, index) => ({
      ...definition,
      amount: amounts[index] ?? money(0, bill.total.currency),
    }));

    // Guard the invariant rather than trusting the helper blindly.
    const reconciled = sumMoney(shares.map((share) => share.amount));
    if (reconciled.cents !== bill.total.cents) {
      return {
        bill,
        agreement,
        shares,
        recovered: money(0, bill.total.currency),
        ownerExpense: bill.total,
        rejection: 'shares-do-not-reconcile',
      };
    }

    const recovered = sumMoney(shares.filter((share) => share.recoverable).map((share) => share.amount));

    return {
      bill,
      agreement,
      shares,
      recovered,
      // A recovered amount is a tenant charge, not an owner expense. Only the
      // remainder is the owner's cost — counting both would double-count.
      ownerExpense: subtractMoney(bill.total, recovered),
      rejection: null,
    };
  },

  listAllocations(): readonly BillAllocation[] {
    return sharedBillsRepository.list().map((bill) => sharedBillsService.allocate(bill.id));
  },

  applyFilter(allocations: readonly BillAllocation[], filter: SharedBillFilter): readonly BillAllocation[] {
    switch (filter) {
      case 'all':
        return allocations;
      case 'recoverable':
        return allocations.filter((entry) => entry.recovered.cents > 0);
      case 'owner-cost':
        return allocations.filter((entry) => entry.ownerExpense.cents > 0);
      case 'needs-review':
        return allocations.filter((entry) => entry.bill.recoveryReviewedOn === null);
      case 'blocked':
        return allocations.filter((entry) => entry.rejection !== null);
    }
  },

  counts(): Record<SharedBillFilter, number> {
    const allocations = sharedBillsService.listAllocations();
    const count = (filter: SharedBillFilter): number =>
      sharedBillsService.applyFilter(allocations, filter).length;
    return {
      all: allocations.length,
      recoverable: count('recoverable'),
      'owner-cost': count('owner-cost'),
      'needs-review': count('needs-review'),
      blocked: count('blocked'),
    };
  },

  /** Charges recoverable from one lease across all bills — feeds tenant billing. */
  recoveriesForLease(leaseId: LeaseId): readonly { readonly bill: SharedBill; readonly amount: Money }[] {
    return sharedBillsService
      .listAllocations()
      .flatMap((allocation) =>
        allocation.shares
          .filter((share) => share.recoverable && share.leaseId === leaseId)
          .map((share) => ({ bill: allocation.bill, amount: share.amount })),
      );
  },

  /**
   * The owner's unrecovered cost for a property over a period.
   * This is the figure that belongs in expenses; the recovered portion does not.
   */
  ownerExpenseForProperty(propertyId: PropertyId, from: IsoDate, to: IsoDate): Money {
    propertiesService.require(propertyId);
    return sumMoney(
      sharedBillsService
        .listAllocations()
        .filter(
          (allocation) =>
            allocation.bill.propertyId === propertyId &&
            allocation.bill.effectiveOn >= from &&
            allocation.bill.effectiveOn <= to,
        )
        .map((allocation) => allocation.ownerExpense),
    );
  },

  /**
   * Validate a proposed split before it is stored.
   * Throws rather than rounding into balance, so a bad agreement is visible.
   */
  validateShares(total: Money, weights: readonly number[], basis: AllocationAgreement['basis']): void {
    if (weights.length === 0) throw new ValidationError('An allocation needs at least one share.');
    if (weights.some((weight) => weight < 0)) {
      throw new ValidationError('Allocation weights must not be negative.');
    }

    if (basis === 'percentage') {
      const sum = weights.reduce((total_, weight) => total_ + weight, 0);
      if (Math.abs(sum - 100) > 1e-9) {
        throw new ValidationError(`Percentage shares must total 100%, received ${sum}%.`);
      }
    }

    if (basis === 'fixed') {
      const sum = weights.reduce((total_, weight) => total_ + weight, 0);
      if (Math.round(sum) !== total.cents) {
        throw new ValidationError('Fixed shares must add up to the bill total.');
      }
    }
  },

  /** Record the outcome of a recoverability review. Never inferred (FR-07). */
  recordRecoveryReview(billId: string, reviewedOn: IsoDate, deadline: IsoDate | null): SharedBill {
    const bill = sharedBillsService.require(billId);
    if (bill.agreementId === null) {
      throw new PolicyRequiredError(
        'allocation-agreement',
        'Record an approved allocation agreement before reviewing recoverability.',
      );
    }
    return { ...bill, recoveryReviewedOn: reviewedOn, recoveryDeadline: deadline };
  },
};
