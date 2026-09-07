import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { dashboardApi } from '@/modules/dashboard/api';
import { dashboardQuerySchema } from '@/modules/dashboard/validation';

/** GET /api/dashboard/net-worth — net worth and its components (BR-01). */
export function GET(request: NextRequest) {
  return handle(() => dashboardApi.netWorth(parseQuery(request, dashboardQuerySchema).asOf));
}
