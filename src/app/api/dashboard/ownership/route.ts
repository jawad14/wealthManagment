import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { dashboardApi } from '@/modules/dashboard/api';
import { dashboardQuerySchema } from '@/modules/dashboard/validation';

/** GET /api/dashboard/ownership — consolidated positions per entity (BR-02). */
export function GET(request: NextRequest) {
  return handle(() => dashboardApi.ownership(parseQuery(request, dashboardQuerySchema).asOf));
}
