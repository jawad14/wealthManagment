/**
 * Reconciliation business logic (FR-06).
 */
import { NotFoundError, ValidationError } from '@/shared/lib/errors';
import { money, sumMoney, type Money } from '@/shared/lib/money';
import type { BankImportId, BankTransactionId, IsoDate, UserId } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import { reconciliationRepository } from './repository';
import {
  HIGH_CONFIDENCE_THRESHOLD,
  IMPORT_STAGE_LABELS,
  IMPORT_STAGE_ORDER,
  type BankImport,
  type ImportStage,
  type ImportSummary,
  type PostedCashFlowMonth,
  type StagedTransaction,
} from './model';

export type TransactionFilter = 'all' | 'auto-matched' | 'needs-review' | 'unmatched' | 'confirmed';

export const reconciliationService = {
  /** The import the reconcile screen is working on. */
  currentImport(): BankImport | null {
    return reconciliationRepository.latestImport() ?? null;
  },

  requireImport(id: BankImportId): BankImport {
    const record = reconciliationRepository.findImport(id);
    if (!record) throw new NotFoundError('Bank import', id);
    return record;
  },

  listTransactions(importId: BankImportId, filter: TransactionFilter = 'all'): readonly StagedTransaction[] {
    const rows = reconciliationRepository.listTransactions(importId);
    return filter === 'all' ? rows : rows.filter((txn) => txn.state === filter);
  },

  /**
   * Import counters, derived from the staged rows rather than stored, so they
   * cannot drift as rows are confirmed or re-allocated.
   */
  summarise(importId: BankImportId): ImportSummary {
    const rows = reconciliationRepository.listTransactions(importId);
    const unmatched = rows.filter((txn) => txn.state === 'unmatched');
    return {
      staged: rows.length,
      autoMatched: rows.filter((txn) => txn.state === 'auto-matched').length,
      needsReview: rows.filter((txn) => txn.state === 'needs-review').length,
      unmatched: unmatched.length,
      unmatchedValue: sumMoney(unmatched.map((txn) => money(Math.abs(txn.amount.cents), txn.amount.currency))),
    };
  },

  /** Stepper state for the import wizard. */
  stages(importId: BankImportId): readonly { readonly label: string; readonly state: 'done' | 'current' | 'todo' }[] {
    const record = reconciliationService.requireImport(importId);
    const currentIndex = IMPORT_STAGE_ORDER.indexOf(record.stage);
    return IMPORT_STAGE_ORDER.map((stage, index) => ({
      label: IMPORT_STAGE_LABELS[stage],
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo',
    }));
  },

  /**
   * Confirm a single row.
   *
   * Confirmation records who did it and when, and preserves both the original
   * suggestion and any correction — the raw bank text is never rewritten.
   */
  confirm(input: {
    readonly transactionId: BankTransactionId;
    readonly actor: UserId;
    readonly correctionNote?: string;
  }): StagedTransaction {
    const txn = reconciliationRepository.findTransaction(input.transactionId);
    if (!txn) throw new NotFoundError('Staged transaction', input.transactionId);
    if (txn.state === 'unmatched' && !input.correctionNote) {
      throw new ValidationError('An unmatched transaction must be allocated before it can be confirmed.');
    }

    const updated = reconciliationRepository.updateTransaction(txn.id, {
      state: 'confirmed',
      confirmedBy: input.actor,
      confirmedAt: new Date().toISOString(),
      ...(input.correctionNote ? { correctionNote: input.correctionNote } : {}),
    });
    if (!updated) throw new NotFoundError('Staged transaction', input.transactionId);

    accessService.record({
      actor: accessService.resolveUserName(input.actor) ?? 'system',
      summary: `Transaction confirmed · ${txn.rawDescription}`,
      context: `${txn.date} · ${txn.suggestion?.label ?? 'manual allocation'}`,
    });
    return updated;
  },

  /**
   * Confirm every high-confidence row in one action.
   * Low-confidence and unmatched rows are deliberately excluded — a bulk action
   * must never sweep up rows the matcher was unsure about.
   */
  confirmAllHighConfidence(importId: BankImportId, actor: UserId): number {
    const eligible = reconciliationRepository
      .listTransactions(importId)
      .filter(
        (txn) =>
          txn.state === 'auto-matched' &&
          txn.suggestion !== null &&
          (txn.suggestion.confidence ?? 0) >= HIGH_CONFIDENCE_THRESHOLD,
      );

    eligible.forEach((txn) => {
      reconciliationRepository.updateTransaction(txn.id, {
        state: 'confirmed',
        confirmedBy: actor,
        confirmedAt: new Date().toISOString(),
      });
    });

    accessService.record({
      actor: accessService.resolveUserName(actor) ?? 'system',
      summary: `Bulk confirmation · ${eligible.length} high-confidence rows`,
      context: `Import ${importId}`,
    });
    return eligible.length;
  },

  /** How many rows the bulk-confirm action would affect. */
  highConfidenceCount(importId: BankImportId): number {
    return reconciliationRepository
      .listTransactions(importId)
      .filter(
        (txn) =>
          txn.state === 'auto-matched' &&
          txn.suggestion !== null &&
          (txn.suggestion.confidence ?? 0) >= HIGH_CONFIDENCE_THRESHOLD,
      ).length;
  },

  /**
   * Cash movements for a period, on a cash basis (BR-03).
   *
   * Internal transfers and loan drawdowns are excluded: moving money between the
   * portfolio's own accounts is not income or expenditure, and counting it would
   * inflate both sides of the cash-flow chart.
   */
  cashFlowBetween(from: IsoDate, to: IsoDate): { readonly receipts: Money; readonly outgoings: Money } {
    const rows = reconciliationRepository
      .listImports()
      .flatMap((record) => reconciliationRepository.listTransactions(record.id))
      .filter((txn) => txn.date >= from && txn.date <= to)
      .filter((txn) => txn.suggestion?.kind !== 'transfer' && !txn.suggestion?.excludedFromCashFlow);

    return {
      receipts: sumMoney(rows.filter((txn) => txn.amount.cents > 0).map((txn) => txn.amount)),
      outgoings: sumMoney(
        rows.filter((txn) => txn.amount.cents < 0).map((txn) => money(-txn.amount.cents, txn.amount.currency)),
      ),
    };
  },

  /** Unmatched rows across every import — the dashboard's attention item. */
  unmatchedCount(): number {
    return reconciliationRepository
      .listImports()
      .flatMap((record) => reconciliationRepository.listTransactions(record.id))
      .filter((txn) => txn.state === 'unmatched').length;
  },

  unmatchedValue(): Money {
    const rows = reconciliationRepository
      .listImports()
      .flatMap((record) => reconciliationRepository.listTransactions(record.id))
      .filter((txn) => txn.state === 'unmatched');
    return sumMoney(rows.map((txn) => money(Math.abs(txn.amount.cents), txn.amount.currency)));
  },

  stageLabel(stage: ImportStage): string {
    return IMPORT_STAGE_LABELS[stage];
  },

  /**
   * Amounts excluded from cash-flow reporting in a period (BR-03).
   *
   * Internal transfers and loan drawdowns are not operating income or
   * expenditure. They are surfaced rather than silently dropped, so a reader can
   * see what was left out and why the account movement does not equal the
   * reported cash flow.
   */
  excludedTransferAmounts(from: IsoDate, to: IsoDate): readonly Money[] {
    return reconciliationRepository
      .listImports()
      .flatMap((record) => reconciliationRepository.listTransactions(record.id))
      .filter((txn) => txn.date >= from && txn.date <= to)
      .filter((txn) => txn.suggestion?.kind === 'transfer' || txn.suggestion?.excludedFromCashFlow === true)
      .map((txn) => txn.amount);
  },
};

/**
 * Posted cash-flow reads. Separate from the staged-import service surface
 * because these figures are settled history, not work in progress.
 */
export const cashFlowService = {
  /** The `count` most recent posted months ending at the month containing `asOf`, oldest first. */
  recentMonths(asOf: IsoDate, count: number): readonly PostedCashFlowMonth[] {
    const anchor = `${asOf.slice(0, 7)}-01`;
    return reconciliationRepository
      .listPostedCashFlow()
      .filter((entry) => entry.month <= anchor)
      .slice(-count);
  },

  /** The posted month containing `asOf`, or the most recent one before it. */
  latestMonth(asOf: IsoDate): PostedCashFlowMonth | null {
    return cashFlowService.recentMonths(asOf, 1)[0] ?? null;
  },

  /** The month immediately before `latestMonth`, for month-on-month deltas. */
  priorMonth(asOf: IsoDate): PostedCashFlowMonth | null {
    const months = cashFlowService.recentMonths(asOf, 2);
    return months.length === 2 ? months[0] ?? null : null;
  },
};
