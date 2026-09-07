import type { NextRequest } from 'next/server';
import { handle, type RouteContext } from '@/server/http/route';
import { propertiesApi } from '@/modules/properties/api';

/** GET /api/properties/:propertyId — a single property (FR-02). */
export async function GET(request: NextRequest, context: RouteContext<{ propertyId: string }>) {
  const { propertyId } = await context.params;
  const asOf = request.nextUrl.searchParams.get('asOf') ?? undefined;
  return handle(() => propertiesApi.get(propertyId, asOf));
}
