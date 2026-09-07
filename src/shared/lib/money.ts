/**
 * Money handling.
 *
 * All monetary amounts are stored and passed around as **integer minor units**
 * (cents) to avoid binary floating-point drift. Formatting to a display string
 * happens only at the presentation edge.
 */
import type { CurrencyCode } from '@/shared/types/common';
import { BASE_CURRENCY, LOCALE } from '@/shared/config/app-config';

/** An amount in integer minor units (cents) with its currency. */
export interface Money {
  readonly cents: number;
  readonly currency: CurrencyCode;
}

export function money(cents: number, currency: CurrencyCode = BASE_CURRENCY): Money {
  if (!Number.isInteger(cents)) {
    throw new TypeError(`Money.cents must be an integer minor unit, received ${cents}`);
  }
  return { cents, currency };
}

/** Build Money from a major-unit number (e.g. 1860.5 -> 186050 cents). */
export function fromMajorUnits(amount: number, currency: CurrencyCode = BASE_CURRENCY): Money {
  return money(Math.round(amount * 100), currency);
}

export function toMajorUnits(value: Money): number {
  return value.cents / 100;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot combine ${a.currency} with ${b.currency}; convert to a common currency first.`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents + b.cents, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents - b.cents, a.currency);
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode = BASE_CURRENCY): Money {
  return values.reduce<Money>((acc, value) => addMoney(acc, value), money(0, currency));
}

/**
 * Scale an amount by a ratio (e.g. an ownership share of 0.5).
 * Rounds half away from zero so that a 50% split of an odd cent total is stable.
 */
export function scaleMoney(value: Money, ratio: number): Money {
  const scaled = value.cents * ratio;
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return money(rounded, value.currency);
}

export function negateMoney(value: Money): Money {
  return money(-value.cents, value.currency);
}

export function isZero(value: Money): boolean {
  return value.cents === 0;
}

export interface FormatMoneyOptions {
  /** Show cents. Defaults to false — the design shows whole dollars on KPI tiles. */
  readonly showCents?: boolean;
  /** Render a leading "+" for positive values (used for receipts and receivables). */
  readonly signed?: boolean;
  /** Render as a compact "—" when the amount is null/undefined. */
  readonly locale?: string;
}

/**
 * Format Money the way the design prototype does: "$4,821,300", "$1,860.00", "+$300.00", "−$412.00".
 * Note the minus sign is U+2212, matching the design's typography.
 */
export function formatMoney(value: Money | null | undefined, options: FormatMoneyOptions = {}): string {
  if (value == null) return '—';
  const { showCents = false, signed = false, locale = LOCALE } = options;
  const magnitude = Math.abs(value.cents) / 100;
  const body = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
    currencyDisplay: 'narrowSymbol',
  }).format(magnitude);

  if (value.cents < 0) return `−${body}`;
  if (signed && value.cents > 0) return `+${body}`;
  return body;
}

/**
 * Split an amount across weights so the parts sum **exactly** to the total.
 *
 * BR-06 requires rounding to be defined at allocation boundaries so totals
 * balance. Naive per-part rounding loses or gains cents: 60/40 of $200.01 gives
 * $120.01 + $80.00 = $200.01 only if the remainder is deliberately assigned.
 * This uses the largest-remainder method, giving leftover cents to the parts
 * with the largest fractional remainders, so no cent is created or destroyed.
 *
 * @param total   the amount to divide
 * @param weights relative weights; need not sum to 1
 */
export function allocateMoney(total: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) return [];
  if (weights.some((weight) => weight < 0)) {
    throw new RangeError('Allocation weights must not be negative.');
  }

  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) {
    throw new RangeError('Allocation weights must sum to a positive value.');
  }

  const sign = total.cents < 0 ? -1 : 1;
  const magnitude = Math.abs(total.cents);

  const exact = weights.map((weight) => (magnitude * weight) / weightTotal);
  const floors = exact.map(Math.floor);
  let remainder = magnitude - floors.reduce((sum, value) => sum + value, 0);

  // Hand out the leftover cents to the largest fractional remainders first.
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const parts = [...floors];
  for (const { index } of order) {
    if (remainder <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    remainder -= 1;
  }

  return parts.map((cents) => money(sign * cents, total.currency));
}

/** Format a ratio as a percentage, e.g. 0.582 -> "58.2%". Returns "Unavailable" for null (BR-04). */
export function formatPercent(ratio: number | null | undefined, fractionDigits = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return 'Unavailable';
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}
