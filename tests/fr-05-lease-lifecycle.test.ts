/**
 * FR-05 — leases and payment schedules.
 *
 * Acceptance: "A fortnightly lease generates the agreed due dates; an early
 * termination removes only unearned future charges and leaves receipts intact."
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { leasesService } from '@/modules/leases/service';
import { leasesRepository } from '@/modules/leases/repository';
import { LEASE_IDS } from '@/modules/leases/data/seed';
import { asId } from '@/shared/types/common';
import { fromMajorUnits } from '@/shared/lib/money';
import { ValidationError } from '@/shared/lib/errors';

const AS_OF = '2026-09-06';

beforeEach(() => {
  leasesRepository.reset();
});

describe('FR-05 · charge generation', () => {
  it('generates fortnightly charges on the agreed schedule', () => {
    const created = leasesService.generateCharges(LEASE_IDS.nguyenR3);
    const dates = created.map((charge) => charge.dueOn);

    // Anchored 2 Jun 2026, fortnightly, to 31 May 2027.
    expect(dates[0]).toBe('2026-06-02');
    expect(dates[1]).toBe('2026-06-16');
    expect(dates[2]).toBe('2026-06-30');

    // Every gap is exactly 14 days.
    for (let i = 1; i < dates.length; i += 1) {
      const gap =
        (Date.parse(`${dates[i]}T00:00:00Z`) - Date.parse(`${dates[i - 1]}T00:00:00Z`)) / 86_400_000;
      expect(gap).toBe(14);
    }
    // None fall past the lease end.
    expect(dates[dates.length - 1]! <= '2027-05-31').toBe(true);
  });

  it('charges every generated period at the lease rent', () => {
    const created = leasesService.generateCharges(LEASE_IDS.chenR2);
    expect(created.every((charge) => charge.amount.cents === fromMajorUnits(330).cents)).toBe(true);
  });
});

describe('FR-05 · early termination', () => {
  it('removes only unearned future charges and leaves receipts intact', () => {
    leasesService.generateCharges(LEASE_IDS.chenR2);
    const before = leasesRepository.listCharges(LEASE_IDS.chenR2).length;

    const result = leasesService.terminate({
      leaseId: LEASE_IDS.chenR2,
      endsOn: '2026-10-31',
      reason: 'Tenant relocating for work',
    });

    const remaining = leasesRepository.listCharges(LEASE_IDS.chenR2);
    expect(result.removedCharges).toBeGreaterThan(0);
    expect(remaining.length).toBe(before - result.removedCharges);
    // Nothing earned was touched.
    expect(remaining.every((charge) => charge.dueOn <= '2026-10-31')).toBe(true);
    expect(result.lease.endsOn).toBe('2026-10-31');
  });

  it('keeps a future charge that already has a receipt against it', () => {
    // Williams paid ahead: the 2 Sep charge carries an allocation.
    const paidCharge = asId<'RentCharge'>('chg-williams-0902');
    expect(leasesRepository.listAllocations(paidCharge).length).toBeGreaterThan(0);

    leasesService.terminate({
      leaseId: LEASE_IDS.williamsR4,
      endsOn: '2026-09-01',
      reason: 'Ended by agreement',
    });

    // The charge is dated after the termination date but was paid, so it stays.
    const kept = leasesRepository.listCharges(LEASE_IDS.williamsR4).map((charge) => charge.id);
    expect(kept).toContain(paidCharge);
    expect(leasesRepository.listAllocations(paidCharge).length).toBeGreaterThan(0);
  });

  it('leaves arrears unchanged when a tenant in arrears is terminated', () => {
    const before = leasesService.arrearsFor(LEASE_IDS.patelBenton, AS_OF).outstanding.cents;

    leasesService.terminate({
      leaseId: LEASE_IDS.patelBenton,
      endsOn: '2026-09-06',
      reason: 'Lease not renewed',
    });

    // Money already owed is not forgiven by ending the lease.
    expect(leasesService.arrearsFor(LEASE_IDS.patelBenton, AS_OF).outstanding.cents).toBe(before);
  });

  it('rejects a termination without a reason, or outside the lease term', () => {
    expect(() =>
      leasesService.terminate({ leaseId: LEASE_IDS.chenR2, endsOn: '2026-10-31', reason: '  ' }),
    ).toThrow(ValidationError);
    expect(() =>
      leasesService.terminate({ leaseId: LEASE_IDS.chenR2, endsOn: '2028-01-01', reason: 'Too late' }),
    ).toThrow(ValidationError);
  });
});

describe('FR-05 · effective rent changes', () => {
  it('reprices only future unpaid charges', () => {
    leasesService.generateCharges(LEASE_IDS.chenR2);
    const newRent = fromMajorUnits(360);

    const result = leasesService.changeRent({
      leaseId: LEASE_IDS.chenR2,
      newRent,
      effectiveFrom: '2026-11-01',
    });

    const charges = leasesRepository.listCharges(LEASE_IDS.chenR2);
    for (const charge of charges) {
      const expected = charge.dueOn >= '2026-11-01' ? newRent.cents : fromMajorUnits(330).cents;
      expect(charge.amount.cents, `charge ${charge.dueOn}`).toBe(expected);
    }
    expect(result.repricedCharges).toBeGreaterThan(0);
    expect(result.lease.rent.cents).toBe(newRent.cents);
  });

  it('never restates a charge that has already been paid', () => {
    const paidCharge = asId<'RentCharge'>('chg-williams-0902');
    const originalAmount = leasesRepository
      .listCharges(LEASE_IDS.williamsR4)
      .find((charge) => charge.id === paidCharge)?.amount.cents;

    leasesService.changeRent({
      leaseId: LEASE_IDS.williamsR4,
      newRent: fromMajorUnits(400),
      effectiveFrom: '2026-08-01',
    });

    const after = leasesRepository
      .listCharges(LEASE_IDS.williamsR4)
      .find((charge) => charge.id === paidCharge)?.amount.cents;
    expect(after).toBe(originalAmount);
  });

  it('rejects a zero rent or a change before the lease started', () => {
    expect(() =>
      leasesService.changeRent({ leaseId: LEASE_IDS.chenR2, newRent: fromMajorUnits(0), effectiveFrom: '2026-11-01' }),
    ).toThrow(ValidationError);
    expect(() =>
      leasesService.changeRent({ leaseId: LEASE_IDS.chenR2, newRent: fromMajorUnits(360), effectiveFrom: '2020-01-01' }),
    ).toThrow(ValidationError);
  });
});
