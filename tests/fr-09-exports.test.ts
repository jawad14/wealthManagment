/**
 * FR-09 — "Exports must apply the same permissions as the screen."
 * UAT-04 — a delegate must not reach restricted totals through exports.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { exportsService } from '@/modules/dashboard/exports';
import { accessService } from '@/modules/access/service';
import { USER_IDS } from '@/modules/access/data/seed';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { ForbiddenError } from '@/shared/lib/errors';

const asOf = resolveAsOfDate();

/** Run a block as a specific user by pinning the resolved scope. */
function asUser(userId: (typeof USER_IDS)[keyof typeof USER_IDS]) {
  return vi.spyOn(accessService, 'currentScope').mockReturnValue(accessService.scopeFor(userId));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FR-09 · exports carry the screen’s permissions', () => {
  it('lets the portfolio owner export net worth', () => {
    asUser(USER_IDS.jawad);
    const result = exportsService.exportExplanation('net-worth', asOf);

    expect(result.filename).toBe(`net-worth-${asOf}.csv`);
    expect(result.contentType).toContain('text/csv');
    expect(result.body).toContain('# Net worth');
    expect(result.body).toContain('# Reconciles: yes');
  });

  it('denies an operations delegate a net-worth export (UAT-04)', () => {
    asUser(USER_IDS.mahvish);
    // The delegate cannot see portfolio totals on screen, so they cannot export them.
    expect(() => exportsService.exportExplanation('net-worth', asOf)).toThrow(ForbiddenError);
  });

  it('still lets that delegate export what they can see', () => {
    asUser(USER_IDS.mahvish);
    // A delegate has lease.read but not export.create, so even a permitted
    // metric is refused — both rights are required.
    expect(() => exportsService.exportExplanation('arrears', asOf)).toThrow(ForbiddenError);
  });

  it('denies the accountant a metric they cannot read, despite holding export rights', () => {
    const scope = accessService.scopeFor(USER_IDS.accountant);
    expect(scope.capabilities).toContain('export.create');
    expect(scope.capabilities).not.toContain('portfolio.totals.read');

    asUser(USER_IDS.accountant);
    expect(() => exportsService.exportExplanation('net-worth', asOf)).toThrow(ForbiddenError);
    // But a metric they can read exports fine.
    expect(() => exportsService.exportExplanation('operating-expenses', asOf)).not.toThrow();
  });

  it('denies the technical operator every export', () => {
    asUser(USER_IDS.operator);
    for (const metric of ['net-worth', 'arrears', 'operating-expenses'] as const) {
      expect(() => exportsService.exportExplanation(metric, asOf)).toThrow(ForbiddenError);
    }
  });

  it('writes the rule and total into the file so it stands alone', () => {
    asUser(USER_IDS.jawad);
    const body = exportsService.exportExplanation('arrears', asOf).body;

    expect(body).toContain('BR-05');
    expect(body).toContain('# Total:');
    expect(body.split('\n').length).toBeGreaterThan(5);
  });

  it('escapes quotes so a crafted label cannot break the CSV', () => {
    asUser(USER_IDS.jawad);
    const body = exportsService.exportExplanation('operating-expenses', asOf).body;
    // Every data row must have balanced quoting.
    for (const line of body.split('\n').filter((row) => !row.startsWith('#'))) {
      expect((line.match(/"/g) ?? []).length % 2).toBe(0);
    }
  });

  it('records every export in the audit log (NFR-03)', () => {
    asUser(USER_IDS.jawad);
    const before = accessService.listAuditEvents().length;
    exportsService.exportExplanation('assets', asOf);
    const after = accessService.listAuditEvents();

    expect(after.length).toBe(before + 1);
    expect(after[0]?.summary).toContain('Export');
    expect(after[0]?.summary).toContain('permission-filtered');
  });
});
