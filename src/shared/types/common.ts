/**
 * Primitive domain types shared by every module.
 * Nothing here may import from a module — dependencies point inward only.
 */

/** ISO-4217 currency code. The platform is single-currency (AUD) in Release 1. */
export type CurrencyCode = 'AUD';

/** An ISO-8601 calendar date with no time component, e.g. "2026-09-06". */
export type IsoDate = string;

/** An ISO-8601 instant, e.g. "2026-09-06T08:51:00.000Z". */
export type IsoDateTime = string;

/** Branded identifier so ids of different aggregates cannot be swapped by mistake. */
export type Id<TBrand extends string> = string & { readonly __brand: TBrand };

export type EntityId = Id<'Entity'>;
export type PropertyId = Id<'Property'>;
export type PropertyComponentId = Id<'PropertyComponent'>;
export type ValuationId = Id<'Valuation'>;
export type LeaseId = Id<'Lease'>;
export type TenantId = Id<'Tenant'>;
export type RentChargeId = Id<'RentCharge'>;
export type ObligationId = Id<'Obligation'>;
export type ReminderId = Id<'Reminder'>;
export type LoanId = Id<'Loan'>;
export type DocumentId = Id<'Document'>;
export type BankImportId = Id<'BankImport'>;
export type BankTransactionId = Id<'BankTransaction'>;
export type UserId = Id<'User'>;
export type AuditEventId = Id<'AuditEvent'>;

/** Cast a raw string to a branded id at a trust boundary (seed data, request parsing). */
export function asId<TBrand extends string>(raw: string): Id<TBrand> {
  return raw as Id<TBrand>;
}

/** A half-open date range: `from` inclusive, `to` exclusive/open when null. */
export interface DateRange {
  readonly from: IsoDate;
  readonly to: IsoDate | null;
}

/** Every record carries provenance so the UI can always answer "where did this come from?". */
export interface Provenance {
  readonly recordedAt: IsoDateTime;
  readonly recordedBy: UserId;
  /** Optional source document backing the record (FR-04 linkage). */
  readonly sourceDocumentId?: DocumentId;
}

/** Standard cursorless pagination envelope used by list endpoints. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
}

/** Severity vocabulary shared by chips, banners and attention items. */
export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral' | 'gold';
