import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { sharedBillsApi } from '@/modules/shared-bills/api';
import { sharedBillFilterSchema } from '@/modules/shared-bills/validation';

/** GET /api/shared-bills — bills with their resolved splits and recoveries (FR-07). */
export function GET(request: NextRequest) {
  return handle(() => sharedBillsApi.list(parseQuery(request, sharedBillFilterSchema)));
}
