/**
 * UAT-02 — "Partial/advance/combined rent payments, refunds and duplicate CSV
 * imports reconcile exactly."
 *
 * FR-06 acceptance — "For a $500 charge and $300 receipt, arrears are $200;
 * importing that receipt twice does not change the balance. A reversal restores
 * the correct outstanding amount."
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { leasesService } from '@/modules/leases/service';
import { leasesRepository } from '@/modules/leases/repository';
import { LEASE_IDS } from '@/modules/leases/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import { asId } from '@/shared/types/common';
import { fromMajorUnits } from '@/shared/lib/money';
import { ConflictError, ValidationError } from '@/shared/lib/errors';

const AS_OF = '2026-09-06';
const NGUYEN_CHARGE = asId<'RentCharge'>('chg-nguyen-0825');

// Collections persist across tests in-process; reset to the seeded fixture so
// each case starts from a known balance.
beforeEach(() => {
  leasesRepository.reset();
});

describe('FR-06 / UAT-02 · reconciliation', () => {
  it('leaves $200 outstanding on a $500 charge part-paid by $300', () => {
    const position = leasesService.arrearsFor(LEASE_IDS.nguyenR3, AS_OF);

    expect(position.due.cents).toBe(fromMajorUnits(500).cents);
    expect(position.received.cents).toBe(fromMajorUnits(300).cents);
    expect(position.outstanding.cents).toBe(fromMajorUnits(200).cents);
    expect(position.state).toBe('partial');
  });

  it('does not change the balance when the same bank receipt is imported twice', () => {
    const before = leasesService.arrearsFor(LEASE_IDS.nguyenR3, AS_OF).outstanding.cents;

    // The seeded allocation already carries this transaction id.
    const duplicate = leasesService.recordReceipt({
      chargeId: NGUYEN_CHARGE,
      amount: fromMajorUnits(300),
      receivedOn: '2026-08-28',
      bankTransactionId: 'txn-nguyen-rent-0828',
    });

    expect(duplicate).toBeNull();
    expect(leasesService.arrearsFor(LEASE_IDS.nguyenR3, AS_OF).outstanding.cents).toBe(before);
  });

  it('restores the outstanding amount when a payment is reversed', () => {
    expect(leasesService.arrearsFor(LEASE_IDS.nguyenR3, AS_OF).outstanding.cents).toBe(
      fromMajorUnits(200).cents,
    );

    leasesService.recordReversal({
      allocationId: 'alloc-nguyen-0828',
      reversedOn: '2026-09-02',
      note: 'Payment dishonoured by the bank',
    });

    const after = leasesService.arrearsFor(LEASE_IDS.nguyenR3, AS_OF);
    // The full $500 is owing again.
    expect(after.outstanding.cents).toBe(fromMajorUnits(500).cents);
    // The original receipt is still on the record; it was not deleted.
    expect(after.received.cents).toBe(fromMajorUnits(300).cents);
    expect(after.reversals.cents).toBe(fromMajorUnits(-300).cents);
  });

  it('reduces arrears by an approved credit without recording cash received', () => {
    leasesService.recordCredit({
      chargeId: NGUYEN_CHARGE,
      amount: fromMajorUnits(200),
      appliedOn: '2026-09-03',
      approvedBy: USER_IDS.jawad,
      note: 'Agreed adjustment for the repair delay',
    });

    const after = leasesService.arrearsFor(LEASE_IDS.nguyenR3, AS_OF);
    expect(after.outstanding.cents).toBe(0);
    expect(after.credits.cents).toBe(fromMajorUnits(200).cents);
    // Cash received is unchanged — a credit is not a payment.
    expect(after.received.cents).toBe(fromMajorUnits(300).cents);
  });

  it('treats an advance payment as credit, not as arrears', () => {
    const position = leasesService.arrearsFor(LEASE_IDS.williamsR4, AS_OF);

    expect(position.outstanding.cents).toBeLessThan(0);
    expect(position.state).toBe('paid-ahead');
  });

  it('does not count future rent as arrears (BR-05)', () => {
    // Evaluated before the charge falls due, nothing is owing.
    const early = leasesService.arrearsFor(LEASE_IDS.patelBenton, '2026-08-01');
    expect(early.due.cents).toBe(0);
    expect(early.outstanding.cents).toBe(0);

    const later = leasesService.arrearsFor(LEASE_IDS.patelBenton, AS_OF);
    expect(later.due.cents).toBeGreaterThan(0);
  });

  it('refuses a second reversal of the same allocation', () => {
    leasesService.recordReversal({
      allocationId: 'alloc-patel-0829',
      reversedOn: '2026-09-02',
      note: 'Dishonoured',
    });
    expect(() =>
      leasesService.recordReversal({
        allocationId: 'alloc-patel-0829',
        reversedOn: '2026-09-03',
        note: 'Duplicate attempt',
      }),
    ).toThrow(ConflictError);
  });

  it('refuses a credit without a stated reason', () => {
    expect(() =>
      leasesService.recordCredit({
        chargeId: NGUYEN_CHARGE,
        amount: fromMajorUnits(50),
        appliedOn: '2026-09-03',
        approvedBy: USER_IDS.jawad,
        note: '  ',
      }),
    ).toThrow(ValidationError);
  });

  it('reconciles the portfolio arrears total to the sum of its positions', () => {
    const summary = leasesService.arrearsSummary(AS_OF);
    const positions = leasesService.listArrears(AS_OF);
    const summed = positions.reduce((total, position) => total + position.outstanding.cents, 0);

    expect(summary.total.cents).toBe(summed);
    expect(summary.total.cents).toBe(fromMajorUnits(1_240).cents);
  });
});
