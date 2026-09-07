/**
 * BR-03 — cash flow, operating result and tax reported separately.
 *
 * "Cash flow = cash receipts minus cash outgoings for the period. Internal
 * transfers and loan proceeds are not operating income. Loan principal is a cash
 * outflow but not interest expense. Depreciation is non-cash. Report cash flow,
 * operating result and tax estimates separately."
 */
import { describe, expect, it } from 'vitest';
import { dashboardService } from '@/modules/dashboard/service';
import { reconciliationService } from '@/modules/reconciliation/service';
import { resolveAsOfDate } from '@/shared/config/app-config';

const asOf = resolveAsOfDate();

describe('BR-03 · cash basis and separated reporting', () => {
  it('reports cash flow and operating result as distinct figures', () => {
    const position = dashboardService.financialPosition(asOf);

    // They must not be the same number by accident — that would mean the
    // separation is nominal rather than real.
    expect(position.cashFlow.net.cents).not.toBe(position.operatingResult.net.cents);
  });

  it('counts loan principal as a cash outflow but not as an expense', () => {
    const position = dashboardService.financialPosition(asOf);

    const { loanPrincipal, outgoings } = position.cashFlow;
    const { operatingExpenses, interestExpense } = position.operatingResult;

    // Principal is real cash out...
    expect(loanPrincipal.cents).toBeGreaterThan(0);
    expect(outgoings.cents).toBeGreaterThanOrEqual(loanPrincipal.cents);

    // ...but is not part of the operating cost base, which carries interest instead.
    expect(interestExpense.cents).toBeGreaterThan(0);
    const operatingCosts = operatingExpenses.cents + interestExpense.cents;
    expect(operatingCosts).toBeLessThan(outgoings.cents + interestExpense.cents);
  });

  it('excludes internal transfers from the cash-flow chart', () => {
    const withTransfers = reconciliationService.cashFlowBetween('2026-08-01', '2026-08-31');
    const excluded = reconciliationService.excludedTransferAmounts('2026-08-01', '2026-08-31');

    // The seeded $5,000 own-account transfer is excluded, not netted in.
    expect(excluded.length).toBeGreaterThan(0);
    expect(excluded.some((amount) => Math.abs(amount.cents) === 500_000)).toBe(true);
    expect(withTransfers.outgoings.cents).toBeGreaterThan(0);
  });

  it('surfaces the excluded amount rather than dropping it silently', () => {
    const position = dashboardService.financialPosition(asOf);
    expect(position.cashFlow.excludedTransfers.cents).toBeGreaterThan(0);
  });

  it('does not estimate tax, and says so', () => {
    const position = dashboardService.financialPosition(asOf);

    expect(position.taxEstimate).toBeNull();
    expect(position.taxEstimateNote).toMatch(/professional validation/i);
  });

  it('treats depreciation as out of scope rather than as zero', () => {
    const position = dashboardService.financialPosition(asOf);
    expect(position.operatingResult.depreciation).toBeNull();
  });

  it('nets cash flow as receipts minus outgoings exactly', () => {
    const { receipts, outgoings, net } = dashboardService.financialPosition(asOf).cashFlow;
    expect(net.cents).toBe(receipts.cents - outgoings.cents);
  });
});
