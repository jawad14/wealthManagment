import type { Metadata } from 'next';
import { documentsService, type DocumentView } from '@/modules/documents/service';
import { DocumentsScreen } from '@/modules/documents/components/DocumentsScreen';
import type { DocumentFilter } from '@/modules/documents/model';

export const metadata: Metadata = { title: 'Documents · Holdfast' };

const FILTERS: readonly DocumentFilter[] = [
  'all',
  'leases',
  'insurance',
  'invoices-receipts',
  'loans',
  'valuations',
  'unlinked',
];

/** FR-04 — document register with linkage and versions. */
export default function DocumentsPage() {
  const rowsByFilter = FILTERS.reduce(
    (accumulator, filter) => ({ ...accumulator, [filter]: documentsService.list(filter) }),
    {} as Record<DocumentFilter, readonly DocumentView[]>,
  );

  return <DocumentsScreen rowsByFilter={rowsByFilter} counts={documentsService.counts()} />;
}
