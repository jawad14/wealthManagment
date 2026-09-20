/**
 * Transport-agnostic handlers for the search module.
 */
import { resolveAsOfDate } from '@/shared/config/app-config';
import type { SearchResults } from '@/shared/types/search';
import { accessService } from '@/modules/access/service';
import { searchService } from './service';
import type { SearchQuery } from './validation';

export const searchApi = {
  search(query: SearchQuery): SearchResults {
    // NFR-01: search spans five modules, so no single capability can gate it —
    // a family contributor may search obligations and nothing else. The scope is
    // resolved here and the service applies each category's own capability and
    // record scope, omitting whatever the caller may not see.
    const scope = accessService.currentScope();
    return searchService.search(query.q, query.asOf ?? resolveAsOfDate(), scope);
  },
};
