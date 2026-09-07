/**
 * Documents data access.
 */
import { createCollection } from '@/server/db/collection';
import type { DocumentId } from '@/shared/types/common';
import type { DocumentRecord } from './model';
import { seedDocuments } from './data/seed';

const documents = createCollection<DocumentRecord>('documents.documents', seedDocuments);

export const documentsRepository = {
  /** Visible documents only — removed records stay in storage but not in lists. */
  list: (): readonly DocumentRecord[] =>
    [...documents.where((record) => record.removedAt === undefined)].sort((a, b) =>
      b.uploadedOn.localeCompare(a.uploadedOn),
    ),
  /** Includes removed documents. Used by audit and history views. */
  listIncludingRemoved: (): readonly DocumentRecord[] => documents.list(),
  find: (id: DocumentId): DocumentRecord | undefined => documents.find(id),
  insert: (record: DocumentRecord): DocumentRecord => documents.insert(record),
  update: (id: DocumentId, changes: Partial<Omit<DocumentRecord, 'id'>>): DocumentRecord | undefined =>
    documents.update(id, changes),
};
