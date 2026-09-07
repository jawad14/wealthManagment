/**
 * Calendar-date helpers.
 *
 * Dates in this platform are calendar dates (no timezone). All arithmetic is
 * done in UTC to keep it stable regardless of where the server runs.
 */
import type { IsoDate } from '@/shared/types/common';

const MS_PER_DAY = 86_400_000;

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export function toDate(value: IsoDate): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new TypeError(`Invalid ISO date: ${value}`);
  return parsed;
}

export function toIsoDate(value: Date): IsoDate {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  return toIsoDate(new Date(toDate(value).getTime() + days * MS_PER_DAY));
}

export function addMonths(value: IsoDate, months: number): IsoDate {
  const date = toDate(value);
  const targetMonth = date.getUTCMonth() + months;
  const candidate = new Date(Date.UTC(date.getUTCFullYear(), targetMonth, 1));
  // Clamp to the last valid day when the target month is shorter (31 Jan + 1 month -> 28/29 Feb).
  const lastDay = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0)).getUTCDate();
  candidate.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return toIsoDate(candidate);
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / MS_PER_DAY);
}

export function monthsBetween(from: IsoDate, to: IsoDate): number {
  const a = toDate(from);
  const b = toDate(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12
    + (b.getUTCMonth() - a.getUTCMonth())
    - (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

export function isOnOrBefore(a: IsoDate, b: IsoDate): boolean {
  return a <= b;
}

/** True when `value` falls inside a half-open range (`to === null` means open-ended). */
export function isWithin(value: IsoDate, from: IsoDate, to: IsoDate | null): boolean {
  if (value < from) return false;
  return to === null || value <= to;
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

/** "6 Sep 2026" — the long form used in headers and detail panels. */
export function formatDateLong(value: IsoDate): string {
  const date = toDate(value);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "14 Sep" — the short form used in tables and list rows. */
export function formatDateShort(value: IsoDate): string {
  const date = toDate(value);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

/** "31 Aug 26" — the compact form used in the loans table's "As of" column. */
export function formatDateCompact(value: IsoDate): string {
  const date = toDate(value);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`;
}

/** Split into the day/month pair the dashboard date-box renders. */
export function toDateBoxParts(value: IsoDate): { day: string; month: string } {
  const date = toDate(value);
  return { day: String(date.getUTCDate()), month: MONTHS_SHORT[date.getUTCMonth()] ?? '' };
}

/** "Aug" — month label for the cash-flow chart axis and month-scoped KPI labels. */
export function formatMonthShort(value: IsoDate): string {
  return MONTHS_SHORT[toDate(value).getUTCMonth()] ?? '';
}

/** First day of the month containing `value`. */
export function startOfMonth(value: IsoDate): IsoDate {
  return `${value.slice(0, 7)}-01`;
}

/** Last day of the month containing `value`. */
export function endOfMonth(value: IsoDate): IsoDate {
  const date = toDate(value);
  return toIsoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

/** The `count` months ending with the month containing `value`, oldest first. */
export function recentMonths(value: IsoDate, count: number): IsoDate[] {
  const anchor = startOfMonth(value);
  return Array.from({ length: count }, (_, index) => addMonths(anchor, index - (count - 1)));
}
