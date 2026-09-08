'use server';

import { revalidatePath } from 'next/cache';
import { asId } from '@/shared/types/common';
import { runAction, type ActionResult } from '@/shared/lib/action-result';
import { readString, requireString } from '@/shared/lib/form-data';
import { NotFoundError, ValidationError } from '@/shared/lib/errors';
import { accessService } from '@/modules/access/service';
import { reconciliationService } from './service';
import { reconciliationRepository } from './repository';

function revalidate(): void {
  revalidatePath('/bank-import');
  revalidatePath('/dashboard');
}

/** Confirm one staged row (FR-06). A suggestion only becomes a posting here. */
export async function confirmTransactionAction(
  _previous: ActionResult<unknown>,
  form: FormData,
): Promise<ActionResult<unknown>> {
  return runAction('Transaction confirmed', () => {
    const result = reconciliationService.confirm({
      transactionId: asId<'BankTransaction'>(requireString(form, 'transactionId', 'Transaction')),
      actor: accessService.getCurrentUser().id,
      ...(readString(form, 'correctionNote') ? { correctionNote: readString(form, 'correctionNote')! } : {}),
    });
    revalidate();
    return result;
  });
}

/**
 * Confirm every high-confidence row at once.
 *
 * Deliberately does not touch low-confidence or unmatched rows — a bulk action
 * must never sweep up something the matcher was unsure about.
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- useActionState requires
   both parameters even when this action reads neither. */
export async function confirmAllHighConfidenceAction(
  _previous: ActionResult<unknown>,
  _form: FormData,
): Promise<ActionResult<unknown>> {
  return runAction(
    (count) => `Confirmed ${count} high-confidence row${count === 1 ? '' : 's'}`,
    () => {
      const result = reconciliationService.confirmAllHighConfidence(
        requireCurrentImport(),
        accessService.getCurrentUser().id,
      );
      revalidate();
      return result;
    },
  );
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Allocate a row the matcher could not place, then confirm it.
 *
 * The correction is stored alongside the original suggestion rather than
 * replacing it, and the raw bank text is never rewritten (FR-06).
 */
export async function allocateTransactionAction(
  _previous: ActionResult<unknown>,
  form: FormData,
): Promise<ActionResult<unknown>> {
  return runAction('Transaction allocated and confirmed', () => {
    const transactionId = asId<'BankTransaction'>(requireString(form, 'transactionId', 'Transaction'));
    const allocation = readString(form, 'allocation');
    if (!allocation) {
      throw new ValidationError('Choose what this transaction relates to.', {
        fieldErrors: { allocation: ['An allocation is required before a row can be confirmed.'] },
      });
    }

    const note = readString(form, 'note');
    const result = reconciliationService.confirm({
      transactionId,
      actor: accessService.getCurrentUser().id,
      correctionNote: note ? `${allocation} · ${note}` : allocation,
    });
    revalidate();
    return result;
  });
}

/** Leave a row unmatched on purpose, recording that it was reviewed. */
export async function leaveUnmatchedAction(
  _previous: ActionResult<unknown>,
  form: FormData,
): Promise<ActionResult<unknown>> {
  return runAction('Left unmatched · stays unposted', () => {
    const transactionId = asId<'BankTransaction'>(requireString(form, 'transactionId', 'Transaction'));
    const txn = reconciliationRepository.findTransaction(transactionId);
    if (!txn) throw new NotFoundError('Staged transaction', transactionId);

    const updated = reconciliationRepository.updateTransaction(transactionId, { state: 'unmatched' });
    accessService.record({
      actor: accessService.getCurrentUser().name,
      summary: `Transaction left unmatched · ${txn.rawDescription}`,
      context: `${txn.date} · reviewed, stays unposted until allocated`,
    });
    revalidate();
    return updated;
  });
}

function requireCurrentImport() {
  const current = reconciliationService.currentImport();
  if (!current) throw new NotFoundError('Bank import', 'current');
  return current.id;
}
