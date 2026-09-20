import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { searchApi } from '@/modules/search/api';
import { searchQuerySchema } from '@/modules/search/validation';

/** GET /api/search?q=… — permission-filtered global search (FR-09). */
export function GET(request: NextRequest) {
  return handle(() => searchApi.search(parseQuery(request, searchQuerySchema)));
}
