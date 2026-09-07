import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { leasesApi } from '@/modules/leases/api';
import { leaseFilterSchema } from '@/modules/leases/validation';

/** GET /api/leases — leases with derived status and next charge date (FR-05). */
export function GET(request: NextRequest) {
  return handle(() => leasesApi.list(parseQuery(request, leaseFilterSchema)));
}
