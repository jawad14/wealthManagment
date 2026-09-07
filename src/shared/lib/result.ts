/**
 * A lightweight Result type for operations whose failure is an expected outcome
 * rather than an exception (matching confidence, computed metrics with missing
 * inputs, etc.). Services still throw AppError for genuine faults.
 */

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * A value that may be genuinely unknown, distinct from zero.
 *
 * The design is explicit that "Unavailable beats zero": a missing valuation must
 * render as "Unavailable", never as 0%. Anything computed from possibly-missing
 * inputs returns this so the UI cannot accidentally print a misleading zero.
 */
export type Available<T> =
  | { readonly available: true; readonly value: T }
  | { readonly available: false; readonly reason: string };

export function available<T>(value: T): Available<T> {
  return { available: true, value };
}

export function unavailable<T = never>(reason: string): Available<T> {
  return { available: false, reason };
}

export function mapAvailable<T, U>(input: Available<T>, fn: (value: T) => U): Available<U> {
  return input.available ? available(fn(input.value)) : input;
}
