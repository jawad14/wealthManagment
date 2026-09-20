/**
 * FR-06 — "Post to ledger", the bank import wizard's final step.
 *
 * A suggestion is not a posting: nothing may reach posted cash flow while any
 * row still carries a suggestion nobody has reviewed. Expected figures below are
 * hand-derived from the seeded August statement, not computed from the service.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { reconciliationService } from '@/modules/reconciliation/service';
import { reconciliationRepository } from '@/modules/reconciliation/repository';
import { postImportToLedgerAction } from '@/modules/reconciliation/actions';
import { IMPORT_ID } from '@/modules/reconciliation/data/seed';
import { INTERNAL_TRANSFER_ALLOCATION } from '@/modules/reconciliation/model';
import { USER_IDS } from '@/modules/access/data/seed';
import { asId } from '@/shared/types/common';
import { ConflictError, ValidationError } from '@/shared/lib/errors';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';

const ACTOR = USER_IDS.jawad;
const AUGUST = '2026-08-01';

// Seeded posted August, before this import is posted.
const SEEDED_RECEIPTS = 2_841_000;
const SEEDED_OUTGOINGS = 1_987_000;

// Auto-matched receipts: 19 weekly rents (5×350 + 5×330 + 5×340 + 4×360 = 6,540)
// plus the $300 Nguyen part-payment.
const RENT_RECEIPTS = 684_000;
// Auto-matched outgoings: 412 + 142.50 + 311.25 + 418 + 3,860 + 6,250 + 1,830
// + 186.40 + 99 + 373.33. The $5,000 internal transfer is excluded (BR-03).
const MATCHED_OUTGOINGS = 1_388_248;
// The three low-confidence card purchases: 286.40 + 96.35 + 64.90.
const REVIEWED_OUTGOINGS = 44_765;

function reviewLowConfidenceRows(): void {
  ['txn-bunnings-0822', 'txn-hardware-0810', 'txn-unknown-eft-0814'].forEach((id) => {
    reconciliationService.confirm({
      transactionId: asId<'BankTransaction'>(id),
      actor: ACTOR,
      correctionNote: 'Property · 166 Compton Rd',
    });
  });
}

beforeEach(() => {
  reconciliationRepository.reset();
});

describe('FR-06 · post to ledger', () => {
  it('refuses to post while rows still await review, and changes nothing', () => {
    expect(() => reconciliationService.postToLedger(IMPORT_ID, ACTOR)).toThrow(ValidationError);
    expect(() => reconciliationService.postToLedger(IMPORT_ID, ACTOR)).toThrow(/confirmed or left unmatched/i);

    expect(reconciliationService.requireImport(IMPORT_ID).stage).toBe('match');
    expect(reconciliationRepository.findPostedCashFlow(AUGUST)?.receipts.cents).toBe(SEEDED_RECEIPTS);
  });

  it('still refuses when only the low-confidence rows remain', () => {
    reconciliationService.confirmAllHighConfidence(IMPORT_ID, ACTOR);

    expect(() => reconciliationService.postToLedger(IMPORT_ID, ACTOR)).toThrow(/3 rows still await review/);
  });

  it('posts once every row is confirmed or left unmatched', () => {
    reconciliationService.confirmAllHighConfidence(IMPORT_ID, ACTOR);
    reviewLowConfidenceRows();

    const posted = reconciliationService.postToLedger(IMPORT_ID, ACTOR);

    expect(posted.stage).toBe('posted');
    expect(posted.postedBy).toBe(ACTOR);
    expect(reconciliationService.requireImport(IMPORT_ID).stage).toBe('posted');
    // Step 5 is complete, not merely current.
    expect(reconciliationService.stages(IMPORT_ID).map((step) => step.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
    ]);
  });

  it('rolls confirmed receipts and outgoings into the posted month, excluding transfers', () => {
    reconciliationService.confirmAllHighConfidence(IMPORT_ID, ACTOR);
    reviewLowConfidenceRows();
    reconciliationService.postToLedger(IMPORT_ID, ACTOR);

    const august = reconciliationRepository.findPostedCashFlow(AUGUST);
    expect(august?.receipts.cents).toBe(SEEDED_RECEIPTS + RENT_RECEIPTS);
    expect(august?.outgoings.cents).toBe(SEEDED_OUTGOINGS + MATCHED_OUTGOINGS + REVIEWED_OUTGOINGS);
    // A bank line does not say how much of a repayment was principal.
    expect(august?.loanPrincipalComponent.cents).toBe(914_000);
  });

  it('leaves unmatched rows unposted', () => {
    reconciliationService.confirmAllHighConfidence(IMPORT_ID, ACTOR);
    reviewLowConfidenceRows();
    reconciliationService.postToLedger(IMPORT_ID, ACTOR);

    const unmatched = reconciliationService.listTransactions(IMPORT_ID, 'unmatched');
    expect(unmatched).toHaveLength(4);
    expect(unmatched.every((txn) => txn.postedAt === undefined)).toBe(true);
    expect(reconciliationService.readyToPostCount(IMPORT_ID)).toBe(0);
  });

  it('cannot be posted twice, and posted rows cannot be changed', () => {
    reconciliationService.confirmAllHighConfidence(IMPORT_ID, ACTOR);
    reviewLowConfidenceRows();
    reconciliationService.postToLedger(IMPORT_ID, ACTOR);
    const afterFirst = reconciliationRepository.findPostedCashFlow(AUGUST);

    expect(() => reconciliationService.postToLedger(IMPORT_ID, ACTOR)).toThrow(ConflictError);
    expect(reconciliationRepository.findPostedCashFlow(AUGUST)).toEqual(afterFirst);
    expect(() =>
      reconciliationService.confirm({ transactionId: asId<'BankTransaction'>('txn-bunnings-0822'), actor: ACTOR }),
    ).toThrow(ConflictError);
  });

  it('posts only the late allocation when an unmatched row is allocated after posting', () => {
    reconciliationService.confirmAllHighConfidence(IMPORT_ID, ACTOR);
    reviewLowConfidenceRows();
    reconciliationService.postToLedger(IMPORT_ID, ACTOR);

    // The $1,200 cash deposit turns out to be rent.
    reconciliationService.confirm({
      transactionId: asId<'BankTransaction'>('txn-deposit-0819'),
      actor: ACTOR,
      correctionNote: 'Property · 166 Compton Rd',
    });
    expect(reconciliationService.readyToPostCount(IMPORT_ID)).toBe(1);
    reconciliationService.postToLedger(IMPORT_ID, ACTOR);

    expect(reconciliationRepository.findPostedCashFlow(AUGUST)?.receipts.cents).toBe(
      SEEDED_RECEIPTS + RENT_RECEIPTS + 120_000,
    );
  });

  it('keeps a row a person allocated as an internal transfer out of cash flow (BR-03)', () => {
    reconciliationService.confirmAllHighConfidence(IMPORT_ID, ACTOR);
    reviewLowConfidenceRows();
    reconciliationService.confirm({
      transactionId: asId<'BankTransaction'>('txn-transfer-in-0813'),
      actor: ACTOR,
      correctionNote: `${INTERNAL_TRANSFER_ALLOCATION} · from the offset account`,
    });
    reconciliationService.postToLedger(IMPORT_ID, ACTOR);

    expect(reconciliationRepository.findPostedCashFlow(AUGUST)?.receipts.cents).toBe(SEEDED_RECEIPTS + RENT_RECEIPTS);
  });

  it('reports a blocked posting through the action as a message, not an exception', async () => {
    const form = new FormData();
    form.append('importId', IMPORT_ID);

    const blocked = await postImportToLedgerAction(IDLE_RESULT as ActionResult<unknown>, form);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.message).toMatch(/confirmed or left unmatched/i);

    reconciliationService.confirmAllHighConfidence(IMPORT_ID, ACTOR);
    reviewLowConfidenceRows();
    const posted = await postImportToLedgerAction(IDLE_RESULT as ActionResult<unknown>, form);
    expect(posted.ok).toBe(true);
    expect(reconciliationService.requireImport(IMPORT_ID).stage).toBe('posted');
  });
});
