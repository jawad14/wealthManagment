/**
 * FR-07 — shared bills and recoveries.
 *
 * Acceptance: "A $200 bill split 60/40 creates $120 and $80 charges, with no
 * duplicate owner expense in consolidation; an invalid allocation is rejected."
 */
import { describe, expect, it } from 'vitest';
import { sharedBillsService } from '@/modules/shared-bills/service';
import { BILL_IDS } from '@/modules/shared-bills/data/seed';
import { formatMoney, fromMajorUnits, sumMoney } from '@/shared/lib/money';
import { ValidationError } from '@/shared/lib/errors';

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
