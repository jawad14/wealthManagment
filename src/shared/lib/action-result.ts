/**
 * The shape every Server Action returns.
 *
 * Actions never throw across the network boundary — a thrown error in a Server
 * Action reaches the client as an opaque digest, which is useless to a user
 * filling in a form. Instead they catch, map the domain error to a message, and
 * return it alongside any field-level detail Zod produced.
 */
import { isAppError } from './errors';

export interface ActionSuccess<T = undefined> {
  readonly ok: true;
  readonly message: string;
  readonly value?: T;
}

export interface ActionFailure {
  readonly ok: false;
  readonly message: string;
  /** Field-level messages keyed by input name, for inline validation display. */
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
}

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

/** Idle state for `useActionState`, before the first submission. */
export const IDLE_RESULT: ActionResult<never> = { ok: true, message: '' };

export function actionOk<T>(message: string, value?: T): ActionResult<T> {
  return value === undefined ? { ok: true, message } : { ok: true, message, value };
}

export function actionFailed(
  message: string,
  fieldErrors?: Readonly<Record<string, readonly string[]>>,
): ActionFailure {
  return fieldErrors ? { ok: false, message, fieldErrors } : { ok: false, message };
}

/**
 * Run a mutation and convert any failure into a displayable result.
 *
 * Validation failures carry their field errors through so a form can mark the
 * offending inputs; everything else becomes a single message. Unexpected faults
 * are logged server-side and reported generically — internals never reach the UI.
 */
export async function runAction<T>(
  successMessage: string | ((value: T) => string),
  work: () => T | Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const value = await work();
    const message = typeof successMessage === 'function' ? successMessage(value) : successMessage;
    return actionOk(message, value);
  } catch (error) {
    if (isAppError(error)) {
      const details = error.details as { fieldErrors?: Record<string, string[]> } | undefined;
      return actionFailed(error.message, details?.fieldErrors);
    }
    console.error('[holdfast] action failed', error);
    return actionFailed('Something went wrong. The change was not saved.');
  }
}
