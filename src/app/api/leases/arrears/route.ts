import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { leasesApi } from '@/modules/leases/api';
import { arrearsQuerySchema } from '@/modules/leases/validation';

/** GET /api/leases/arrears — arrears positions (BR-05). */
export function GET(request: NextRequest) {
  return handle(() => leasesApi.arrears(parseQuery(request, arrearsQuerySchema).asOf));
}
