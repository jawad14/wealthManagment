import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { obligationsApi } from '@/modules/obligations/api';
import { obligationFilterSchema } from '@/modules/obligations/validation';

/** GET /api/obligations — obligations with derived status (FR-03, FR-08). */
export function GET(request: NextRequest) {
  return handle(() => obligationsApi.list(parseQuery(request, obligationFilterSchema)));
}
