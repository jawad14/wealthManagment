import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { dashboardApi } from '@/modules/dashboard/api';
import { dashboardQuerySchema } from '@/modules/dashboard/validation';

/** GET /api/dashboard — the full portfolio overview (FR-09). */
export function GET(request: NextRequest) {
  return handle(() => dashboardApi.overview(parseQuery(request, dashboardQuerySchema).asOf));
}
