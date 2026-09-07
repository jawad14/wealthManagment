import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { entitiesApi } from '@/modules/entities/api';
import { entityFilterSchema } from '@/modules/entities/validation';

/** GET /api/entities — entities with their dated relationships (FR-01). */
export function GET(request: NextRequest) {
  return handle(() => entitiesApi.list(parseQuery(request, entityFilterSchema)));
}
