import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { propertiesApi } from '@/modules/properties/api';
import { propertyFilterSchema } from '@/modules/properties/validation';

/** GET /api/properties — properties with valuation status and occupancy (FR-02). */
export function GET(request: NextRequest) {
  return handle(() => propertiesApi.list(parseQuery(request, propertyFilterSchema)));
}
