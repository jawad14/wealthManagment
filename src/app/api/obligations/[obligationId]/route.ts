import type { NextRequest } from 'next/server';
import { handle, type RouteContext } from '@/server/http/route';
import { obligationsApi } from '@/modules/obligations/api';

/** GET /api/obligations/:obligationId — one obligation with its reminder timeline. */
export async function GET(request: NextRequest, context: RouteContext<{ obligationId: string }>) {
  const { obligationId } = await context.params;
  const asOf = request.nextUrl.searchParams.get('asOf') ?? undefined;
  return handle(() => obligationsApi.get(obligationId, asOf));
}
