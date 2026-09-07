/**
 * Bank import & matching domain model (FR-06).
 *
 * The governing rule: **a suggestion is not a posting**. Every staged row keeps
 * the raw bank text, the machine's suggestion and the human's correction, and
 * nothing reaches the ledger until a person confirms it. That is why
 * `MatchSuggestion` is a separate structure from the confirmed allocation, and
 * why `rawDescription` is never overwritten.
 */
import type { BankImportId, BankTransactionId, IsoDate, IsoDateTime, PropertyId, UserId } from '@/shared/types/common';
import type { Money } from '@/shared/lib/money';

/** Wizard stages, in order. */
export type ImportStage = 'upload' | 'validate' | 'duplicates' | 'match' | 'post';

export const IMPORT_STAGE_LABELS: Record<ImportStage, string> = {
  upload: 'Upload',
  validate: 'Validate',
  duplicates: 'Duplicates',
  match: 'Match & confirm',
  post: 'Post to ledger',
};

export const IMPORT_STAGE_ORDER: readonly ImportStage[] = ['upload', 'validate', 'duplicates', 'match', 'post'];

export interface BankImport {
  readonly id: BankImportId;
  /** Account the statement came from, e.g. "CBA Everyday". */
  readonly accountLabel: string;
  readonly importedOn: IsoDate;
  readonly periodFrom: IsoDate;
  readonly periodTo: IsoDate;
  readonly format: 'CSV' | 'OFX';
  readonly stage: ImportStage;
  /**
   * Rows recognised as already imported and therefore not staged again.
   * Duplicate detection compares date, amount and bank reference.
   */
  readonly duplicatesSkipped: number;
  readonly duplicatesSkippedFromDate?: IsoDate;
}

/** What the matcher thinks a row is. */
export type SuggestionKind = 'rent' | 'expense' | 'transfer' | 'unknown';

export interface MatchSuggestion {
  readonly kind: SuggestionKind;
  /** Primary line, e.g. "Rent · A. Nguyen · Room 3 · charge 25 Aug ($500)". */
  readonly label: string;
  /** Secondary line explaining the consequence, e.g. "Partial payment · $200 remains". */
  readonly detail?: string;
  /** 0–1. Null when the matcher produced nothing at all. */
  readonly confidence: number | null;
  /** The record the suggestion would attach to, when it identified one. */
  readonly targetRef?: string;
  readonly propertyId?: PropertyId;
  /**
   * Transfers between the portfolio's own accounts are excluded from income and
   * expenses so cash-flow reporting is not inflated by moving money around (BR-03).
   */
  readonly excludedFromCashFlow?: boolean;
}

/**
 * - `auto-matched`  — high confidence, awaiting a human confirmation.
 * - `needs-review`  — a suggestion exists but confidence is low.
 * - `unmatched`     — no suggestion; stays unposted until allocated.
 * - `confirmed`     — a person accepted it; eligible to post.
 */
export type TransactionState = 'auto-matched' | 'needs-review' | 'unmatched' | 'confirmed';

export interface StagedTransaction {
  readonly id: BankTransactionId;
  readonly importId: BankImportId;
  readonly date: IsoDate;
  /** Raw bank narration, preserved verbatim and never rewritten. */
  readonly rawDescription: string;
  /** Second line from the statement, e.g. "Direct debit", "Ref 166C-R3". */
  readonly rawReference?: string;
  /** Signed: positive is a receipt, negative an outgoing. */
  readonly amount: Money;
  readonly suggestion: MatchSuggestion | null;
  readonly state: TransactionState;
  /** Set once a person confirms or corrects the row. */
  readonly confirmedBy?: UserId;
  readonly confirmedAt?: IsoDateTime;
  /** A human correction, kept alongside the original suggestion rather than replacing it. */
  readonly correctionNote?: string;
}

/** Confidence at or above this is treated as auto-matched. */
export const HIGH_CONFIDENCE_THRESHOLD = 0.6;

export interface ImportSummary {
  readonly staged: number;
  readonly autoMatched: number;
  readonly needsReview: number;
  readonly unmatched: number;
  readonly unmatchedValue: Money;
}

/**
 * A month of **posted** cash movement, on a cash basis (BR-03).
 *
 * Staged transactions describe the import currently being worked on. Once a
 * period is reconciled and posted it is rolled up here, which is what the
 * dashboard's cash-flow chart and month KPIs read. Keeping the two separate
 * means an in-progress import can never move a historical figure.
 */
export interface PostedCashFlowMonth {
  readonly id: string;
  /** First day of the month, e.g. "2026-08-01". */
  readonly month: IsoDate;
  readonly receipts: Money;
  readonly outgoings: Money;
  /** Portion of `outgoings` that repaid loan principal rather than being an expense. */
  readonly loanPrincipalComponent: Money;
  /** Notable one-off inside the month, surfaced under the chart. */
  readonly note?: string;
}
