/**
 * FR-09 — "Drill-down must explain every total."
 *
 * Acceptance: "Dashboard totals reconcile to a seeded test dataset to the cent;
 * transfers and duplicate ownership paths do not inflate income or wealth."
 * UAT-05: "Dashboard cash flow and net worth match independently calculated
 * fixtures."
 */
import { describe, expect, it } from 'vitest';
import { explainService, type ExplainableMetric } from '@/modules/dashboard/explain';
import { dashboardService } from '@/modules/dashboard/service';
import { resolveAsOfDate } from '@/shared/config/app-config';

const asOf = resolveAsOfDate();
const METRICS: readonly ExplainableMetric[] = [
  'net-worth',
  'assets',
  'liabilities',
  'arrears',
  'upcoming-obligations',
  'operating-expenses',
];

describe('FR-09 · drill-down', () => {
  it.each(METRICS)('explains %s with lines that reconcile to the total', (metric) => {
    const explanation = explainService.explain(metric, asOf);

    expect(explanation.reconciles, `${metric} lines do not sum to its total`).toBe(true);
    expect(explanation.rule.length).toBeGreaterThan(0);
  });

  it.each(METRICS)('gives every %s line a source', (metric) => {
    const explanation = explainService.explain(metric, asOf);
    for (const line of explanation.lines) {
      expect(line.source, `${metric} line "${line.label}" has no source`).toBeTruthy();
    }
  });

  it('explains net worth as assets minus liabilities (BR-01)', () => {
    const explanation = explainService.explain('net-worth', asOf);
    const breakdown = dashboardService.netWorth(asOf);

    const additions = explanation.lines
      .filter((line) => !line.isDeduction)
      .reduce((total, line) => total + line.amount.cents, 0);
    const deductions = explanation.lines
      .filter((line) => line.isDeduction)
      .reduce((total, line) => total + line.amount.cents, 0);

    expect(additions).toBe(breakdown.assets.cents);
    expect(deductions).toBe(breakdown.liabilities.cents);
    expect(explanation.total.cents).toBe(breakdown.netWorth.cents);
  });

  it('counts each property exactly once, so ownership paths cannot inflate wealth (BR-02)', () => {
    const explanation = explainService.explain('assets', asOf);
    const propertyLines = explanation.lines.filter((line) => line.id.startsWith('property-'));
    const ids = propertyLines.map((line) => line.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('flags a stale valuation on the line it affects', () => {
    const explanation = explainService.explain('assets', asOf);
    const stale = explanation.lines.filter((line) => line.caveat?.includes('stale'));

    expect(stale.length).toBeGreaterThan(0);
  });

  it('never lets a receivable appear as a liability (FR-11)', () => {
    const liabilities = explainService.explain('liabilities', asOf);
    expect(liabilities.lines.some((line) => line.id.startsWith('receivable-'))).toBe(false);

    const assets = explainService.explain('assets', asOf);
    expect(assets.lines.some((line) => line.id.startsWith('receivable-'))).toBe(true);
  });

  it('reconciles the arrears explanation to the seeded $1,240 to the cent', () => {
    const explanation = explainService.explain('arrears', asOf);
    expect(explanation.total.cents).toBe(124_000);
    expect(explanation.reconciles).toBe(true);
  });
});
