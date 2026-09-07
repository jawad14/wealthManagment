/**
 * Application-wide configuration resolved once at module load.
 * Server-only values must not be referenced from client components.
 */
import type { CurrencyCode, IsoDate } from '@/shared/types/common';

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Holdfast';
export const APP_TAGLINE = 'Wealth & property operations';
export const BASE_CURRENCY: CurrencyCode = 'AUD';
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? 'en-AU';

/**
 * A valuation older than this is presented as stale (design rule: "every total carries a date").
 */
export const STALE_VALUATION_MONTHS = 12;

/** Horizon used by the dashboard "Due in next N days" tile and list (FR-09). */
export const UPCOMING_WINDOW_DAYS = 14;

/**
 * The date the read models are evaluated against.
 *
 * The design prototype is pinned to 6 Sep 2026 and the seeded data is authored
 * relative to that date, so the default keeps the running app identical to the
 * prototype. Unset AS_OF_DATE (or set it to "today") to track the real clock.
 */
export function resolveAsOfDate(): IsoDate {
  const configured = process.env.AS_OF_DATE;
  if (configured && configured !== 'today') return configured;
  if (!configured) return '2026-09-06';
  return new Date().toISOString().slice(0, 10);
}
