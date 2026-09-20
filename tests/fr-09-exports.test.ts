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
import { money } from '@/shared/lib/money';
import {
  TABLE_EXPORT_RESOURCES,
  centsToDollars,
  tableExportsService,
  type TableExportResource,
} from '@/modules/dashboard/table-exports';
import { propertiesService } from '@/modules/properties/service';
import { leasesService } from '@/modules/leases/service';
import { loansService } from '@/modules/loans/service';
import { obligationsService } from '@/modules/obligations/service';

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

/** Split a CSV body into rows of unquoted cells. Every cell this module writes is quoted. */
function parseCsv(body: string): string[][] {
  return body.split('\r\n').map((line) =>
    [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((match) => (match[1] ?? '').replace(/""/g, '"')),
  );
}

describe('FR-09 · list screens export as CSV', () => {
  const HEADERS: Record<TableExportResource, readonly string[]> = {
    properties: ['Address', 'Ownership', 'Status', 'Rental Mode', 'Valuation Amount', 'Valuation Date', 'Debt', 'LVR'],
    leases: ['Tenant Name', 'Property', 'Start Date', 'End Date', 'Rent Amount', 'Frequency', 'Balance', 'Status'],
    loans: ['Lender', 'Facility', 'Borrower', 'Balance', 'Rate', 'Repayment', 'Securing Property', 'LVR'],
    obligations: ['Title', 'Context', 'Property', 'Due Date', 'Recurrence', 'Amount', 'Status', 'Owner'],
  };

  const ROW_COUNTS: Record<TableExportResource, () => number> = {
    properties: () => propertiesService.list().length,
    leases: () => leasesService.list().length,
    loans: () => loansService.list().length,
    obligations: () => obligationsService.list().length,
  };

  it.each(TABLE_EXPORT_RESOURCES)('exports %s with its header, one row per record, and a dated filename', (resource) => {
    asUser(USER_IDS.jawad);
    const result = tableExportsService.exportTable(resource, asOf);
    const [header, ...rows] = parseCsv(result.body);

    expect(result.filename).toBe(`${resource}-${asOf}.csv`);
    expect(result.contentType).toContain('text/csv');
    expect(header).toEqual(HEADERS[resource]);
    expect(rows.length).toBe(ROW_COUNTS[resource]());
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.length).toBe(header?.length);
  });

  it('converts integer cents to plain dollars', () => {
    expect(centsToDollars(money(186000))).toBe('1860.00');
    expect(centsToDollars(money(5))).toBe('0.05');
    expect(centsToDollars(money(-41250))).toBe('-412.50');
    expect(centsToDollars(money(482130099))).toBe('4821300.99');
    // An absent amount is empty, never a misleading zero.
    expect(centsToDollars(null)).toBe('');
  });

  it('writes loan balances and lease rents as dollars, not cents or display strings', () => {
    asUser(USER_IDS.jawad);

    const loans = parseCsv(tableExportsService.exportTable('loans', asOf).body).slice(1);
    loansService.list().forEach((loan, index) => {
      expect(loans[index]?.[3]).toBe((loan.balance.cents / 100).toFixed(2));
      expect(loans[index]?.[5]).toBe((loan.repayment.monthly.cents / 100).toFixed(2));
    });

    const leases = parseCsv(tableExportsService.exportTable('leases', asOf).body).slice(1);
    leasesService.list().forEach((lease, index) => {
      expect(leases[index]?.[4]).toBe((lease.rent.cents / 100).toFixed(2));
      expect(leases[index]?.[4]).not.toMatch(/[$,]/);
    });
  });

  it('matches the figures the screens show', () => {
    asUser(USER_IDS.jawad);

    const properties = parseCsv(tableExportsService.exportTable('properties', asOf).body).slice(1);
    propertiesService.list().forEach((property, index) => {
      const valuation = propertiesService.valuationStatus(property.id, asOf).valuation;
      const lvr = loansService.propertyLvr(property.id, asOf);
      expect(properties[index]?.[4]).toBe(valuation ? (valuation.amount.cents / 100).toFixed(2) : '');
      expect(properties[index]?.[7]).toBe(lvr.available ? `${(lvr.value * 100).toFixed(1)}%` : 'Unavailable');
    });

    const obligations = parseCsv(tableExportsService.exportTable('obligations', asOf).body).slice(1);
    obligationsService.listViews(asOf, 'all').forEach((view, index) => {
      expect(obligations[index]?.[0]).toBe(view.obligation.title);
      expect(obligations[index]?.[6]).toBe(view.statusLabel);
      expect(obligations[index]?.[7]).toBe(view.ownerName ?? '');
    });
  });

  it('escapes quotes, commas and newlines, and defuses formula cells', () => {
    asUser(USER_IDS.jawad);
    const [first] = propertiesService.list();
    if (!first) throw new Error('seed has no properties');
    vi.spyOn(propertiesService, 'list').mockReturnValue([
      { ...first, fullAddress: '12 "The Gables", Unit 3\nWoodridge', ownershipLabel: '=HYPERLINK("http://x")' },
    ]);

    const body = tableExportsService.exportTable('properties', asOf).body;

    expect(body).toContain('"12 ""The Gables"", Unit 3\nWoodridge"');
    // A leading "=" would run as a formula in a spreadsheet; the apostrophe makes it text.
    expect(body).toContain('"\'=HYPERLINK(""http://x"")"');
    const quotes = (body.match(/"/g) ?? []).length;
    expect(quotes % 2).toBe(0);
  });

  it('denies every table when export.create is missing', () => {
    // The delegate can read properties, leases and obligations on screen.
    const scope = accessService.scopeFor(USER_IDS.mahvish);
    expect(scope.capabilities).toContain('property.read');
    expect(scope.capabilities).not.toContain('export.create');

    asUser(USER_IDS.mahvish);
    for (const resource of TABLE_EXPORT_RESOURCES) {
      expect(() => tableExportsService.exportTable(resource, asOf)).toThrow(ForbiddenError);
    }
  });

  it('denies a table the caller cannot read, despite holding export rights', () => {
    const accountant = accessService.scopeFor(USER_IDS.accountant);
    vi.spyOn(accessService, 'currentScope').mockReturnValue({
      ...accountant,
      capabilities: accountant.capabilities.filter((capability) => capability !== 'loan.read'),
    });

    expect(() => tableExportsService.exportTable('loans', asOf)).toThrow(ForbiddenError);
    expect(() => tableExportsService.exportTable('leases', asOf)).not.toThrow();
  });

  it('records a table export in the audit log (NFR-03)', () => {
    asUser(USER_IDS.jawad);
    const before = accessService.listAuditEvents().length;
    tableExportsService.exportTable('leases', asOf);
    const after = accessService.listAuditEvents();

    expect(after.length).toBe(before + 1);
    expect(after[0]?.summary).toContain('Export');
    expect(after[0]?.summary).toContain('permission-filtered');
  });
});
