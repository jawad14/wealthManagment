/**
 * Reading typed values out of a `FormData`.
 *
 * Server Actions receive everything as strings, so the conversion has to happen
 * somewhere. Doing it here — rather than in each action — keeps the "empty means
 * absent, not zero" rule in one place, which matters because a blank optional
 * amount must not silently become $0.
 */
import { ValidationError } from './errors';

export function readString(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function requireString(form: FormData, key: string, label: string): string {
  const value = readString(form, key);
  if (value === undefined) throw new ValidationError(`${label} is required.`);
  return value;
}

/**
 * Parse a money input in major units.
 *
 * Accepts what people actually type — "$1,860.00", "1860", " 1,860 " — and
 * rejects anything else rather than coercing it to NaN or zero.
 */
export function readAmount(form: FormData, key: string): number | undefined {
  const raw = readString(form, key);
  if (raw === undefined) return undefined;
  const cleaned = raw.replace(/[$,\s]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`"${raw}" is not a valid amount.`);
  }
  return parsed;
}

export function readBoolean(form: FormData, key: string): boolean {
  const raw = form.get(key);
  return raw === 'on' || raw === 'true';
}

/** Reads a `<select>` whose empty option means "not chosen". */
export function readChoice<T extends string>(
  form: FormData,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = readString(form, key);
  if (value === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(`"${value}" is not a valid choice for ${key}.`);
  }
  return value as T;
}
