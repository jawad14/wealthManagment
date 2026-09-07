/**
 * Exports (FR-09).
 *
 * "Exports must apply the same permissions as the screen."
 *
 * That sentence is the whole design of this file. An export is not a separate
 * feature with its own access path — it is a rendering of an explanation the
 * caller was already allowed to see. So it resolves the permission for the
 * underlying metric *and* the right to export at all, then serialises the same
 * `Explanation` object the screen renders. There is no query here that a screen
 * could not have made.
 */
import { formatMoney } from '@/shared/lib/money';
import type { IsoDate } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import type { Capability } from '@/modules/access/permissions';
import { explainService, type ExplainableMetric, type Explanation } from './explain';

/** The capability each metric requires — the same one its screen requires. */
const METRIC_CAPABILITY: Record<ExplainableMetric, Capability> = {
  'net-worth': 'portfolio.totals.read',
  assets: 'portfolio.totals.read',
  liabilities: 'portfolio.totals.read',
  arrears: 'lease.read',
  'upcoming-obligations': 'obligation.read',
  'operating-expenses': 'expense.read',
};

export interface ExportResult {
  readonly filename: string;
  readonly contentType: string;
  readonly body: string;
}

/** Escape a value for CSV: quote it and double any embedded quotes. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(explanation: Explanation): string {
  const header = ['Line', 'Source', 'Amount', 'Direction', 'Caveat'];
  const rows = explanation.lines.map((line) =>
    [
      csvCell(line.label),
      csvCell(line.source),
      csvCell(formatMoney(line.amount, { showCents: true })),
      csvCell(line.isDeduction ? 'Deduction' : 'Addition'),
      csvCell(line.caveat ?? ''),
    ].join(','),
  );

  // The rule and the total travel with the data, so an exported file is
  // self-explanatory once it has left the screen.
  const preamble = [
    `# ${explanation.label}`,
    `# As of ${explanation.asOf}`,
    `# Rule: ${explanation.rule}`,
    `# Total: ${formatMoney(explanation.total, { showCents: true })}`,
    `# Reconciles: ${explanation.reconciles ? 'yes' : 'NO — investigate before relying on this file'}`,
  ];

  return [...preamble, header.map(csvCell).join(','), ...rows].join('\n');
}

export const exportsService = {
  /**
   * Export a total's supporting records.
   *
   * Two permissions are asserted: the right to export, and the right to read the
   * metric being exported. Holding one without the other is a denial — an
   * accountant who may export must still be denied a metric they cannot see.
   */
  exportExplanation(metric: ExplainableMetric, asOf: IsoDate): ExportResult {
    const scope = accessService.currentScope();
    accessService.requireCapability(scope, 'export.create');
    accessService.requireCapability(scope, METRIC_CAPABILITY[metric]);

    const explanation = explainService.explain(metric, asOf);

    accessService.record({
      actor: accessService.resolveUserName(scope.userId) ?? 'unknown',
      summary: `Export · ${explanation.label} (permission-filtered)`,
      context: `${explanation.lines.length} lines · as of ${asOf}`,
    });

    return {
      filename: `${metric}-${asOf}.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: toCsv(explanation),
    };
  },

  /** The capability a metric's export requires, for UI affordances. */
  capabilityFor(metric: ExplainableMetric): Capability {
    return METRIC_CAPABILITY[metric];
  },
};
