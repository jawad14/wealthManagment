import type { NextRequest } from 'next/server';
import { handle, parseBody, type RouteContext } from '@/server/http/route';
import { obligationsApi } from '@/modules/obligations/api';
import { recordPaymentSchema } from '@/modules/obligations/validation';

/**
 * POST /api/obligations/:obligationId/payment
 * Closes an obligation by recording payment evidence. Evidence is mandatory —
 * a sent reminder never closes an item (FR-03).
 */
export async function POST(request: NextRequest, context: RouteContext<{ obligationId: string }>) {
  const { obligationId } = await context.params;
  const body = await parseBody(request, recordPaymentSchema);
  return handle(() => obligationsApi.recordPayment(obligationId, body), 201);
}
