import { handle } from '@/server/http/route';
import { accessApi } from '@/modules/access/api';

/** GET /api/access — people, grants, audit log and continuity posture (NFR-01, NFR-03). */
export function GET() {
  return handle(() => accessApi.getOverview());
}
