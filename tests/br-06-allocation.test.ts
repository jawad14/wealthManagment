/**
 * BR-06 — money allocation must balance exactly at allocation boundaries.
 */
import { describe, expect, it } from 'vitest';
import { allocateMoney, fromMajorUnits, money, sumMoney, formatMoney } from '@/shared/lib/money';

describe('BR-06 · allocateMoney', () => {
  it('splits a $200 bill 60/40 into exactly $120 and $80 (FR-07 acceptance)', () => {
    const parts = allocateMoney(fromMajorUnits(200), [60, 40]);
    expect(parts.map((part) => formatMoney(part, { showCents: true }))).toEqual(['$120.00', '$80.00']);
  });

  it('never creates or destroys a cent, however awkward the division', () => {
    const cases: readonly [number, readonly number[]][] = [
      [200.01, [60, 40]],
      [0.01, [1, 1, 1]],
      [412, [60, 40]],
      [99.99, [1, 1, 1]],
      [1000.05, [33.33, 33.33, 33.34]],
      [7.77, [1, 2, 3, 4, 5, 6, 7]],
    ];
    for (const [total, weights] of cases) {
      const source = fromMajorUnits(total);
      const parts = allocateMoney(source, weights);
      expect(sumMoney(parts).cents, `total ${total} split ${weights.join('/')}`).toBe(source.cents);
    }
  });

  it('assigns leftover cents to the largest remainders, not the first share', () => {
    // $0.01 across three equal shares: exactly one share gets the cent.
    const parts = allocateMoney(money(1), [1, 1, 1]);
    expect(parts.map((part) => part.cents).sort()).toEqual([0, 0, 1]);
  });

  it('preserves sign for negative amounts (refunds and reversals)', () => {
    const parts = allocateMoney(fromMajorUnits(-200), [60, 40]);
    expect(parts.map((part) => part.cents)).toEqual([-12_000, -8_000]);
    expect(sumMoney(parts).cents).toBe(-20_000);
  });

  it('rejects weights that cannot define a split', () => {
    expect(() => allocateMoney(fromMajorUnits(100), [0, 0])).toThrow(RangeError);
    expect(() => allocateMoney(fromMajorUnits(100), [-1, 2])).toThrow(RangeError);
  });

  it('refuses non-integer cents so floating-point money cannot enter the system', () => {
    expect(() => money(10.5)).toThrow(TypeError);
  });

  it('refuses to combine different currencies', () => {
    const aud = money(100, 'AUD');
    const foreign = { ...aud, currency: 'USD' as unknown as 'AUD' };
    expect(() => sumMoney([aud, foreign])).toThrow(/Cannot combine/);
  });
});
