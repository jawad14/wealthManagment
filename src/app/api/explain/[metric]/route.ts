import type { NextRequest } from 'next/server';
import { handle, type RouteContext } from '@/server/http/route';
import { explainService, METRIC_LABELS, type ExplainableMetric } from '@/modules/dashboard/explain';
import { accessService } from '@/modules/access/service';
import { exportsService } from '@/modules/dashboard/exports';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { ValidationError } from '@/shared/lib/errors';

/** GET /api/explain/:metric — the records behind a total (FR-09 drill-down). */
export async function GET(request: NextRequest, context: RouteContext<{ metric: string }>) {
  const { metric } = await context.params;
  const asOf = request.nextUrl.searchParams.get('asOf') ?? resolveAsOfDate();

  return handle(() => {
    if (!(metric in METRIC_LABELS)) {
      throw new ValidationError(`Unknown metric "${metric}".`, { allowed: Object.keys(METRIC_LABELS) });
    }
    const typed = metric as ExplainableMetric;
    // Same capability the metric's own screen requires.
    accessService.guard(exportsService.capabilityFor(typed));
    return explainService.explain(typed, asOf);
  });
}
