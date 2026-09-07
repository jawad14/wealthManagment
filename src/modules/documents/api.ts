/**
 * Transport-agnostic handlers for the documents module.
 */
import { asId, type UserId } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import { documentsService, type DocumentView } from './service';
import type { DocumentRecord } from './model';
import type { DocumentQuery, LinkDocumentInput } from './validation';

export const documentsApi = {
  list(query: DocumentQuery): {
    readonly items: readonly DocumentView[];
    readonly counts: Record<string, number>;
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('document.read');
    return { items: documentsService.list(query.filter), counts: documentsService.counts() };
  },

  get(documentId: string): DocumentView {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('document.read');
    return documentsService.view(documentsService.require(asId<'Document'>(documentId)));
  },

  link(documentId: string, input: LinkDocumentInput, actor?: UserId): DocumentRecord {
    return documentsService.link(
      asId<'Document'>(documentId),
      input as Parameters<typeof documentsService.link>[1],
      actor ?? accessService.getCurrentUser().id,
    );
  },

  /** Hides the document; storage and history are untouched. */
  remove(documentId: string, actor?: UserId): DocumentRecord {
    return documentsService.remove(asId<'Document'>(documentId), actor ?? accessService.getCurrentUser().id);
  },
};
