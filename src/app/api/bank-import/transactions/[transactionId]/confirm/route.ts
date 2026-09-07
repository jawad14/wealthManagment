import type { NextRequest } from 'next/server';
import { handle, parseBody, type RouteContext } from '@/server/http/route';
import { reconciliationApi } from '@/modules/reconciliation/api';
import { confirmTransactionSchema } from '@/modules/reconciliation/validation';

/**
 * POST /api/bank-import/transactions/:transactionId/confirm
 * Records a human confirmation. Suggestions never post on their own (FR-06).
 */
export async function POST(request: NextRequest, context: RouteContext<{ transactionId: string }>) {
  const { transactionId } = await context.params;
  const body = await parseBody(request, confirmTransactionSchema);
  return handle(() => reconciliationApi.confirm(transactionId, body));
}
