import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { reconciliationApi } from '@/modules/reconciliation/api';
import { transactionQuerySchema } from '@/modules/reconciliation/validation';

/** GET /api/bank-import — the import in progress with its staged rows (FR-06). */
export function GET(request: NextRequest) {
  return handle(() => reconciliationApi.current(parseQuery(request, transactionQuerySchema)));
}
