import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { loansApi } from '@/modules/loans/api';
import { loanQuerySchema } from '@/modules/loans/validation';

/** GET /api/loans — facilities with LVR availability (FR-03, BR-04, FR-11). */
export function GET(request: NextRequest) {
  return handle(() => loansApi.list(parseQuery(request, loanQuerySchema)));
}
