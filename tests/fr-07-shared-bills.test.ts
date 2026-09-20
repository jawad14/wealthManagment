/**
 * FR-07 — shared bills and recoveries.
 *
 * Acceptance: "A $200 bill split 60/40 creates $120 and $80 charges, with no
 * duplicate owner expense in consolidation; an invalid allocation is rejected."
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { sharedBillsService } from '@/modules/shared-bills/service';
import { sharedBillsRepository } from '@/modules/shared-bills/repository';
import { BILL_IDS } from '@/modules/shared-bills/data/seed';
import { leasesService } from '@/modules/leases/service';
import { leasesRepository } from '@/modules/leases/repository';
import { LEASE_IDS } from '@/modules/leases/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import { formatMoney, fromMajorUnits, sumMoney } from '@/shared/lib/money';
import { ConflictError, ValidationError } from '@/shared/lib/errors';

describe('FR-07 · bill allocation', () => {
  it('splits the seeded $412 water bill 60/40 and reconciles to the total', () => {
    const allocation = sharedBillsService.allocate(BILL_IDS.urbanUtilitiesAug);

    expect(allocation.rejection).toBeNull();
    expect(allocation.shares.map((share) => formatMoney(share.amount, { showCents: true }))).toEqual([
      '$247.20',
      '$164.80',
    ]);
    expect(sumMoney(allocation.shares.map((share) => share.amount)).cents).toBe(
      allocation.bill.total.cents,
    );
  });

  it('treats a recovered amount as a tenant charge, never as an owner expense', () => {
    const allocation = sharedBillsService.allocate(BILL_IDS.urbanUtilitiesAug);

    // Fully recoverable: nothing falls to the owner, so consolidation cannot
    // count the cost twice.
    expect(allocation.recovered.cents).toBe(allocation.bill.total.cents);
    expect(allocation.ownerExpense.cents).toBe(0);
  });

  it('keeps a non-recoverable share as the owner cost', () => {
    const allocation = sharedBillsService.allocate(BILL_IDS.energexAug);

    expect(allocation.rejection).toBeNull();
    expect(allocation.recovered.cents).toBe(0);
    expect(allocation.ownerExpense.cents).toBe(allocation.bill.total.cents);
  });

  it('refuses to split when the governing agreement is not approved', () => {
    const allocation = sharedBillsService.allocate(BILL_IDS.bentonWaterJul);

    expect(allocation.rejection).toBe('agreement-not-approved');
    expect(allocation.shares).toHaveLength(0);
    // The whole bill falls to the owner rather than being guessed at.
    expect(allocation.ownerExpense.cents).toBe(allocation.bill.total.cents);
  });

  it('rejects percentage shares that do not total 100', () => {
    expect(() => sharedBillsService.validateShares(fromMajorUnits(200), [60, 30], 'percentage')).toThrow(
      ValidationError,
    );
    expect(() => sharedBillsService.validateShares(fromMajorUnits(200), [60, 40], 'percentage')).not.toThrow();
  });

  it('rejects fixed shares that do not add up to the bill total', () => {
    const total = fromMajorUnits(200);
    expect(() => sharedBillsService.validateShares(total, [12_000, 7_000], 'fixed')).toThrow(ValidationError);
    expect(() => sharedBillsService.validateShares(total, [12_000, 8_000], 'fixed')).not.toThrow();
  });

  it('exposes the exact 60/40 acceptance case end to end', () => {
    const allocation = sharedBillsService.allocate(BILL_IDS.urbanUtilitiesAug);
    const ratio = allocation.shares.map(
      (share) => Math.round((share.amount.cents / allocation.bill.total.cents) * 100),
    );
    expect(ratio).toEqual([60, 40]);
  });
});

describe('FR-07 · charging shares to the lease ledger', () => {
  const AS_OF = '2026-09-06';

  beforeEach(() => {
    sharedBillsRepository.reset();
    leasesRepository.reset();
  });

  it('creates a utility charge on each lease and raises the tenant’s outstanding balance', () => {
    const before = {
      okafor: leasesService.arrearsFor(LEASE_IDS.okaforR1, AS_OF).outstanding.cents,
      williams: leasesService.arrearsFor(LEASE_IDS.williamsR4, AS_OF).outstanding.cents,
    };

    const result = sharedBillsService.postSharesToLeases(BILL_IDS.urbanUtilitiesAug, USER_IDS.jawad, AS_OF);
    expect(result.chargesCreated).toBe(2);

    // $412 split 60/40 → $247.20 and $164.80, owed on top of whatever was owing.
    expect(leasesService.arrearsFor(LEASE_IDS.okaforR1, AS_OF).outstanding.cents).toBe(before.okafor + 24_720);
    expect(leasesService.arrearsFor(LEASE_IDS.williamsR4, AS_OF).outstanding.cents).toBe(before.williams + 16_480);

    const charge = leasesRepository
      .listCharges(LEASE_IDS.okaforR1)
      .find((entry) => entry.sourceBillId === BILL_IDS.urbanUtilitiesAug);
    expect(charge).toMatchObject({
      kind: 'utility',
      dueOn: '2026-08-28',
      description: 'Water recovery · Urban Utilities',
    });

    expect(sharedBillsService.require(BILL_IDS.urbanUtilitiesAug).postedToLeasesOn).toBe(AS_OF);
  });

  it('refuses to post the same bill twice', () => {
    sharedBillsService.postSharesToLeases(BILL_IDS.urbanUtilitiesAug, USER_IDS.jawad, AS_OF);
    const chargesAfterFirst = leasesRepository.listAllCharges().length;

    expect(() =>
      sharedBillsService.postSharesToLeases(BILL_IDS.urbanUtilitiesAug, USER_IDS.jawad, AS_OF),
    ).toThrow(ConflictError);
    expect(leasesRepository.listAllCharges()).toHaveLength(chargesAfterFirst);
  });

  it('charges nothing for a bill with no recoverable share, a blocked bill, or an unreviewed one', () => {
    const chargesBefore = leasesRepository.listAllCharges().length;

    // Owner-only electricity, an unapproved agreement, and cleaning awaiting review.
    for (const billId of [BILL_IDS.energexAug, BILL_IDS.bentonWaterJul, 'bill-cleaning-compton']) {
      expect(() => sharedBillsService.postSharesToLeases(billId, USER_IDS.jawad, AS_OF)).toThrow(ValidationError);
    }
    expect(leasesRepository.listAllCharges()).toHaveLength(chargesBefore);
  });
});
