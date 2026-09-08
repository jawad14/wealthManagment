/**
 * Documents domain model (FR-04).
 *
 * Two invariants:
 *  1. **Documents are never destroyed.** Removal sets `removedAt`/`removedBy`
 *     and hides the record; the history stays intact.
 *  2. **Versions are additive.** A replacement is a new `DocumentVersion`, so an
 *     amended lease never overwrites the original that was signed.
 */
import type { DocumentId, EntityId, IsoDate, IsoDateTime, PropertyId, UserId } from '@/shared/types/common';

export type DocumentType =
  | 'lease'
  | 'insurance-policy'
  | 'bill'
  | 'invoice'
  | 'receipt'
  | 'loan'
  | 'valuation'
  | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  lease: 'Lease',
  'insurance-policy': 'Insurance policy',
  bill: 'Bill',
  invoice: 'Invoice',
  receipt: 'Receipt',
  loan: 'Loan',
  valuation: 'Valuation',
  other: 'Other',
};

/** What a document can be attached to. A document may have several links. */
export type DocumentLink =
  | { readonly type: 'property'; readonly propertyId: PropertyId; readonly label: string }
  | { readonly type: 'entity'; readonly entityId: EntityId; readonly label: string }
  | { readonly type: 'obligation'; readonly obligationId: string; readonly label: string }
  | { readonly type: 'lease'; readonly leaseId: string; readonly label: string }
  | { readonly type: 'loan'; readonly loanId: string; readonly label: string }
  | { readonly type: 'valuation'; readonly valuationId: string; readonly label: string };

export interface DocumentVersion {
  readonly version: number;
  readonly uploadedAt: IsoDateTime;
  readonly uploadedBy: UserId;
  readonly sizeBytes: number;
  /** What changed in this version, e.g. "Rent increase amendment 1 May". */
  readonly note?: string;
}

export interface DocumentRecord {
  readonly id: DocumentId;
  readonly filename: string;
  readonly type: DocumentType;
  /** Extra descriptor under the filename, e.g. "photo of receipt". */
  readonly descriptor?: string;
  readonly links: readonly DocumentLink[];
  readonly uploadedOn: IsoDate;
  readonly uploadedBy: UserId;
  readonly versions: readonly DocumentVersion[];
  /** Set when the document has been hidden. Never deleted from storage. */
  readonly removedAt?: IsoDateTime;
  readonly removedBy?: UserId;
  /**
   * Assisted extraction is opt-in per document. Nothing is sent to a model
   * unless this is explicitly true (Release 2 capability).
   */
  readonly aiExtractionApproved: boolean;
}

/** Filters offered above the documents table. */
export type DocumentFilter =
  | 'all'
  | 'leases'
  | 'insurance'
  | 'invoices-receipts'
  | 'loans'
  | 'valuations'
  | 'unlinked';

export const DOCUMENT_FILTER_LABELS: Record<DocumentFilter, string> = {
  all: 'All',
  leases: 'Leases',
  insurance: 'Insurance',
  'invoices-receipts': 'Invoices & receipts',
  loans: 'Loans',
  valuations: 'Valuations',
  unlinked: 'Unlinked',
};

/** Types included by each filter. `unlinked` filters on link count instead. */
export const FILTER_TYPES: Record<Exclude<DocumentFilter, 'all' | 'unlinked'>, readonly DocumentType[]> = {
  leases: ['lease'],
  insurance: ['insurance-policy'],
  'invoices-receipts': ['bill', 'invoice', 'receipt'],
  loans: ['loan'],
  valuations: ['valuation'],
};

/** Current size of a document — the newest version's byte count. */
export function currentSizeBytes(record: DocumentRecord): number {
  return record.versions[record.versions.length - 1]?.sizeBytes ?? 0;
}

/** "1.2 MB" / "310 KB" — the size format the design uses. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1_000)} KB`;
}
