/**
 * Documents business logic (FR-04).
 */
import { NotFoundError, ValidationError } from '@/shared/lib/errors';
import { formatDateCompact } from '@/shared/lib/dates';
import type { DocumentId, UserId } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import { documentsRepository } from './repository';
import {
  DOCUMENT_TYPE_LABELS,
  FILTER_TYPES,
  currentSizeBytes,
  formatFileSize,
  type DocumentFilter,
  type DocumentLink,
  type DocumentRecord,
} from './model';

export interface DocumentView {
  readonly record: DocumentRecord;
  readonly typeLabel: string;
  readonly sizeLabel: string;
  /** Combined "Linked to" text, or null when the document is unlinked. */
  readonly linkLabel: string | null;
  /** "20 Aug 26 · Jawad". */
  readonly uploadedLabel: string;
  readonly versionCount: number;
  /** Note from the newest version, shown beside the version count. */
  readonly latestVersionNote: string | null;
}

export const documentsService = {
  view(record: DocumentRecord): DocumentView {
    const latest = record.versions[record.versions.length - 1];
    return {
      record,
      typeLabel: DOCUMENT_TYPE_LABELS[record.type],
      sizeLabel: formatFileSize(currentSizeBytes(record)),
      linkLabel: record.links.length === 0 ? null : record.links.map((link) => link.label).join(' · '),
      uploadedLabel: `${formatDateCompact(record.uploadedOn)} · ${
        accessService.resolveUserName(record.uploadedBy)?.split(' ')[0] ?? 'Unknown'
      }`,
      versionCount: record.versions.length,
      latestVersionNote: latest?.note ?? null,
    };
  },

  list(filter: DocumentFilter = 'all'): readonly DocumentView[] {
    return documentsRepository
      .list()
      .filter((record) => matchesFilter(record, filter))
      .map(documentsService.view);
  },

  require(id: DocumentId): DocumentRecord {
    const record = documentsRepository.find(id);
    if (!record) throw new NotFoundError('Document', id);
    return record;
  },

  counts(): Record<DocumentFilter, number> {
    const records = documentsRepository.list();
    const count = (filter: DocumentFilter): number => records.filter((record) => matchesFilter(record, filter)).length;
    return {
      all: records.length,
      leases: count('leases'),
      insurance: count('insurance'),
      'invoices-receipts': count('invoices-receipts'),
      loans: count('loans'),
      valuations: count('valuations'),
      unlinked: count('unlinked'),
    };
  },

  unlinkedCount(): number {
    return documentsRepository.list().filter((record) => record.links.length === 0).length;
  },

  /** Attach a document to a record. Links are additive — a document may back several records. */
  link(id: DocumentId, link: DocumentLink, actor: UserId): DocumentRecord {
    const record = documentsService.require(id);
    const updated = documentsRepository.update(id, { links: [...record.links, link] });
    if (!updated) throw new NotFoundError('Document', id);

    accessService.record({
      actor: accessService.resolveUserName(actor) ?? 'system',
      summary: `Document linked · ${record.filename}`,
      context: `Linked to ${link.label}`,
    });
    return updated;
  },

  /**
   * Hide a document.
   *
   * The record and every version stay in storage; only visibility changes, and
   * who removed it and when is recorded. There is no hard delete by design.
   */
  remove(id: DocumentId, actor: UserId): DocumentRecord {
    const record = documentsService.require(id);
    if (record.removedAt) throw new ValidationError('This document has already been removed.');

    const updated = documentsRepository.update(id, {
      removedAt: new Date().toISOString(),
      removedBy: actor,
    });
    if (!updated) throw new NotFoundError('Document', id);

    accessService.record({
      actor: accessService.resolveUserName(actor) ?? 'system',
      summary: `Document removed from lists · ${record.filename}`,
      context: 'Hidden, not deleted · full history retained',
    });
    return updated;
  },

  /**
   * Opt a document in to assisted extraction.
   * Nothing is sent to a model without this explicit, per-document approval.
   */
  approveAiExtraction(id: DocumentId, actor: UserId): DocumentRecord {
    const record = documentsService.require(id);
    const updated = documentsRepository.update(id, { aiExtractionApproved: true });
    if (!updated) throw new NotFoundError('Document', id);

    accessService.record({
      actor: accessService.resolveUserName(actor) ?? 'system',
      summary: `Assisted extraction approved · ${record.filename}`,
      context: 'Document may now be processed by the extraction model',
    });
    return updated;
  },
};

function matchesFilter(record: DocumentRecord, filter: DocumentFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unlinked') return record.links.length === 0;
  return FILTER_TYPES[filter].includes(record.type);
}
