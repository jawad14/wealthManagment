/**
 * Reconciliation business logic (FR-06).
 */
import { ConflictError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import { addMoney, formatMoney, money, negateMoney, sumMoney, type Money } from '@/shared/lib/money';
import { asId, type BankImportId, type BankTransactionId, type IsoDate, type UserId } from '@/shared/types/common';
import { isWithin, maxDate, minDate } from '@/shared/lib/dates';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { randomUUID } from 'node:crypto';
import { accessService } from '@/modules/access/service';
import { propertiesService } from '@/modules/properties/service';
import { leasesRepository } from '@/modules/leases/repository';
import { leasesService } from '@/modules/leases/service';
import { reconciliationRepository } from './repository';
import { parseStatementCsv, type ParsedStatementRow } from './csv-parser';
import {
  NAME_MATCH_CONFIDENCE,
  REFERENCE_MATCH_CONFIDENCE,
  type MatchSuggestion,
  HIGH_CONFIDENCE_THRESHOLD,
  IMPORT_STAGE_LABELS,
  IMPORT_STAGE_ORDER,
  isExcludedFromCashFlow,
  type BankImport,
  type ImportStage,
  type ImportSummary,
  type PostedCashFlowMonth,
  type StagedTransaction,
} from './model';

export type TransactionFilter = 'all' | 'auto-matched' | 'needs-review' | 'unmatched' | 'confirmed';

/** Whether `needle` appears in `haystack` as a whole token, so "166C-R1" does not match "166C-R1-P". */
function containsToken(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9-])${escaped}($|[^a-z0-9-])`, 'i').test(haystack);
}

/** Duplicate detection compares date, amount and bank reference (FR-06). */
function duplicateKey(date: IsoDate, amount: Money, reference: string | undefined, description: string): string {
  // Banks and people write the same reference as "Ref 166C-R3" and "166C-R3".
  // A row with no reference falls back to its narration.
  const text = (reference ?? description).toLowerCase().replace(/^ref[\s:.#-]*/, '').replace(/\s+/g, ' ').trim();
  return `${date}|${amount.cents}|${amount.currency}|${text}`;
}

/**
 * Suggest what a statement row is. A suggestion is not a posting — this only
 * decides what the reviewer is shown first.
 *
 * A lease is only considered when it was running on the day the money moved, so
 * a former tenant's reference cannot claim a new receipt.
 */
function suggestMatch(row: ParsedStatementRow): MatchSuggestion | null {
  const narration = `${row.description} ${row.reference ?? ''}`;

  if (row.amount.cents > 0) {
    const leases = leasesRepository.list().filter((lease) => isWithin(row.date, lease.startsOn, lease.endsOn));
    const describe = (lease: (typeof leases)[number], confidence: number, detail: string): MatchSuggestion => ({
      kind: 'rent',
      label: `Rent · ${leasesRepository.findTenant(lease.tenantId)?.name ?? 'Unknown tenant'} · ${leasesService.propertyLabel(lease, 'short')}`,
      detail,
      confidence,
      targetRef: lease.reference,
      propertyId: lease.propertyId,
    });

    const byReference = leases.find((lease) => containsToken(narration, lease.reference));
    if (byReference) return describe(byReference, REFERENCE_MATCH_CONFIDENCE, `Billing reference ${byReference.reference} quoted`);

    const byName = leases.filter((lease) => {
      const surname = leasesRepository.findTenant(lease.tenantId)?.name.split(/\s+/).pop() ?? '';
      return surname.length >= 3 && containsToken(narration, surname);
    });
    const [named] = byName;
    if (named) {
      return describe(
        named,
        NAME_MATCH_CONFIDENCE,
        byName.length > 1 ? `Tenant name only · ${byName.length} leases share it, check which` : 'Matched on tenant name only · no reference quoted',
      );
    }
  }

  const property = propertiesService.list().find((entry) => {
    const shortName = entry.name.split(',')[0] ?? entry.name;
    return containsToken(narration, shortName);
  });
  if (property) {
    return {
      kind: row.amount.cents < 0 ? 'expense' : 'unknown',
      label: `${row.amount.cents < 0 ? 'Property expense' : 'Receipt'} · ${property.name}`,
      detail: 'Matched on property name only',
      confidence: NAME_MATCH_CONFIDENCE,
      propertyId: property.id,
    };
  }
  return null;
}

export const reconciliationService = {
  /**
   * Start a new import from CSV statement text.
   *
   * Rows already staged by an earlier import (same date, amount and reference)
   * are skipped and counted, never staged twice. Everything else is staged with
   * the matcher's suggestion; nothing here confirms or posts a row.
   *
   * The import opens at `match` even when duplicates were skipped: skipping is
   * automatic and reported on the screen, and an import parked at `duplicates`
   * could never be posted.
   */
  createImportFromCsv(input: {
    readonly accountLabel: string;
    readonly format: string;
    readonly csvContent: string;
    readonly actor: UserId;
    /** The day the import is recorded against. Defaults to the platform's as-of date. */
    readonly asOf?: IsoDate;
  }): BankImport {
    const accountLabel = input.accountLabel.trim();
    if (!accountLabel) {
      throw new ValidationError('Enter the account this statement came from.', {
        fieldErrors: { accountLabel: ['An account name is required, e.g. "CBA Everyday Business".'] },
      });
    }
    if (accountLabel.length > 80) {
      throw new ValidationError('The account name is too long.', {
        fieldErrors: { accountLabel: ['Keep the account name to 80 characters or fewer.'] },
      });
    }
    if (input.format.trim().toUpperCase() !== 'CSV') {
      throw new ValidationError(`"${input.format}" statements cannot be imported yet · only CSV is supported.`, {
        fieldErrors: { format: ['Only CSV statements are supported.'] },
      });
    }

    const parsed = parseStatementCsv(input.csvContent);

    const existing = new Map<string, StagedTransaction>();
    reconciliationRepository.listAllTransactions().forEach((txn) => {
      existing.set(duplicateKey(txn.date, txn.amount, txn.rawReference, txn.rawDescription), txn);
    });

    const fresh: ParsedStatementRow[] = [];
    const duplicateOf: StagedTransaction[] = [];
    parsed.forEach((row) => {
      const match = existing.get(duplicateKey(row.date, row.amount, row.reference, row.description));
      if (match) duplicateOf.push(match);
      else fresh.push(row);
    });

    if (fresh.length === 0) {
      throw new ConflictError(
        `Every row in this statement has already been imported · ${parsed.length} duplicate${
          parsed.length === 1 ? '' : 's'
        } skipped, nothing new to stage.`,
      );
    }

    const firstDuplicate = duplicateOf[0];
    const duplicatesFrom = firstDuplicate
      ? reconciliationRepository.findImport(firstDuplicate.importId)?.importedOn
      : undefined;

    const importId = asId<'BankImport'>(`imp-${randomUUID()}`);
    const record = reconciliationRepository.insertImport({
      id: importId,
      accountLabel,
      importedOn: input.asOf ?? resolveAsOfDate(),
      periodFrom: parsed.map((row) => row.date).reduce(minDate),
      periodTo: parsed.map((row) => row.date).reduce(maxDate),
      format: 'CSV',
      stage: 'match',
      duplicatesSkipped: duplicateOf.length,
      ...(duplicatesFrom ? { duplicatesSkippedFromDate: duplicatesFrom } : {}),
    });

    let suggested = 0;
    fresh.forEach((row) => {
      const suggestion = suggestMatch(row);
      if (suggestion) suggested += 1;
      reconciliationRepository.insertTransaction({
        id: asId<'BankTransaction'>(`txn-${randomUUID()}`),
        importId,
        date: row.date,
        rawDescription: row.description,
        ...(row.reference ? { rawReference: row.reference } : {}),
        amount: row.amount,
        suggestion,
        state: !suggestion
          ? 'unmatched'
          : (suggestion.confidence ?? 0) >= HIGH_CONFIDENCE_THRESHOLD
            ? 'auto-matched'
            : 'needs-review',
      });
    });

    accessService.record({
      actor: accessService.resolveUserName(input.actor) ?? 'system',
      summary: `Bank statement imported · ${fresh.length} row${fresh.length === 1 ? '' : 's'} staged`,
      context: `${accountLabel} · ${record.periodFrom} to ${record.periodTo} · ${suggested} suggested · ${
        fresh.length - suggested
      } unmatched · ${duplicateOf.length} duplicate${duplicateOf.length === 1 ? '' : 's'} skipped`,
    });
    return record;
  },

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
    // A posted import has completed every step, including the fifth.
    const currentIndex =
      record.stage === 'posted' ? IMPORT_STAGE_ORDER.length : IMPORT_STAGE_ORDER.indexOf(record.stage);
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
    if (txn.postedAt) {
      throw new ConflictError('This transaction has already been posted to the ledger and can no longer be changed.');
    }
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

  /** Confirmed rows that have not yet been rolled into posted cash flow. */
  readyToPostCount(importId: BankImportId): number {
    return reconciliationRepository
      .listTransactions(importId)
      .filter((txn) => txn.state === 'confirmed' && !txn.postedAt).length;
  },

  /**
   * Post the import's confirmed rows to the ledger — the wizard's final step.
   *
   * Refused while any row still carries an unreviewed suggestion: a suggestion
   * is not a posting. Rows left unmatched do not block, and do not post — they
   * stay unposted until someone allocates them, after which the import can be
   * posted again for just those rows. Each row is stamped `postedAt`, so no row
   * is ever rolled into a month twice.
   *
   * Receipts and outgoings are rolled into the posted month each row falls in,
   * with internal transfers left out (BR-03). The principal portion of a loan
   * repayment cannot be known from a bank line, so `loanPrincipalComponent` is
   * not touched here.
   */
  postToLedger(importId: BankImportId, actor: UserId): BankImport {
    const record = reconciliationService.requireImport(importId);
    const reachedMatching =
      record.stage === 'posted' || IMPORT_STAGE_ORDER.indexOf(record.stage) >= IMPORT_STAGE_ORDER.indexOf('match');
    if (!reachedMatching) {
      throw new ValidationError('This import has not reached matching yet, so there is nothing to post.');
    }

    const rows = reconciliationRepository.listTransactions(importId);
    const awaiting = rows.filter((txn) => txn.state === 'auto-matched' || txn.state === 'needs-review');
    if (awaiting.length > 0) {
      throw new ValidationError(
        `All items must be confirmed or left unmatched before posting · ${awaiting.length} row${
          awaiting.length === 1 ? ' still awaits' : 's still await'
        } review.`,
        { awaitingReview: awaiting.map((txn) => txn.id) },
      );
    }

    const toPost = rows.filter((txn) => txn.state === 'confirmed' && !txn.postedAt);
    if (toPost.length === 0) {
      if (record.stage === 'posted') throw new ConflictError('This import has already been posted to the ledger.');
      throw new ValidationError('No confirmed rows to post. Allocate and confirm at least one row first.');
    }

    const byMonth = new Map<IsoDate, StagedTransaction[]>();
    toPost
      .filter((txn) => !isExcludedFromCashFlow(txn))
      .forEach((txn) => {
        const month = `${txn.date.slice(0, 7)}-01`;
        byMonth.set(month, [...(byMonth.get(month) ?? []), txn]);
      });

    let receipts = money(0);
    let outgoings = money(0);
    byMonth.forEach((monthRows, month) => {
      const monthReceipts = sumMoney(monthRows.filter((txn) => txn.amount.cents > 0).map((txn) => txn.amount));
      const monthOutgoings = sumMoney(
        monthRows.filter((txn) => txn.amount.cents < 0).map((txn) => negateMoney(txn.amount)),
      );
      receipts = addMoney(receipts, monthReceipts);
      outgoings = addMoney(outgoings, monthOutgoings);

      const existing = reconciliationRepository.findPostedCashFlow(month);
      if (existing) {
        reconciliationRepository.updatePostedCashFlow(existing.id, {
          receipts: addMoney(existing.receipts, monthReceipts),
          outgoings: addMoney(existing.outgoings, monthOutgoings),
        });
      } else {
        reconciliationRepository.insertPostedCashFlow({
          id: `cf-${month.slice(0, 7)}`,
          month,
          receipts: monthReceipts,
          outgoings: monthOutgoings,
          loanPrincipalComponent: money(0),
        });
      }
    });

    const postedAt = new Date().toISOString();
    toPost.forEach((txn) => reconciliationRepository.updateTransaction(txn.id, { postedAt }));

    const updated = reconciliationRepository.updateImport(importId, { stage: 'posted', postedBy: actor, postedAt });
    if (!updated) throw new NotFoundError('Bank import', importId);

    const leftUnmatched = rows.filter((txn) => txn.state === 'unmatched').length;
    accessService.record({
      actor: accessService.resolveUserName(actor) ?? 'system',
      summary: `Bank import posted to ledger · ${toPost.length} row${toPost.length === 1 ? '' : 's'}`,
      context: `${record.accountLabel} · receipts ${formatMoney(receipts, { showCents: true })} · outgoings ${formatMoney(
        outgoings,
        { showCents: true },
      )} · ${leftUnmatched} left unmatched`,
    });
    return updated;
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
