import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { documentsApi } from '@/modules/documents/api';
import { documentFilterSchema } from '@/modules/documents/validation';

/** GET /api/documents — the document register (FR-04). */
export function GET(request: NextRequest) {
  return handle(() => documentsApi.list(parseQuery(request, documentFilterSchema)));
}
