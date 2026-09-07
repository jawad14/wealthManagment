/**
 * UAT-05 — "Dashboard cash flow and net worth match independently calculated
 * fixtures."
 *
 * FR-09 acceptance — "Dashboard totals reconcile to a seeded test dataset to the
 * cent; transfers and duplicate ownership paths do not inflate income or wealth."
 *
 * The fixtures below are calculated by hand from the seeded records, deliberately
 * *not* by calling the services under test. If a calculation changes, this file
 * must be updated consciously — that is the point.
 */
import { describe, expect, it } from 'vitest';
import { dashboardService } from '@/modules/dashboard/service';
import { leasesService } from '@/modules/leases/service';
import { resolveAsOfDate } from '@/shared/config/app-config';

const asOf = resolveAsOfDate();

/** Hand-calculated from the seed files, in cents. */
const FIXTURE = {
  // Property valuations at the owning entity's share.
  comptonRd: 118_000_000, // Family Trust 100%
  bentonSt: 94_000_000, // Esteem 100%
  watsonRd: 105_200_000, // Jawad 50% + Mahvish 50%
  miansRd: 76_000_000, // Family Trust 100%
  loganReserve: 31_800_000, // Esteem 100%
  receivable: 12_000_000, // S. Khalid loan (FR-11: an asset)

  // Liabilities.
  macquarie: 61_240_000,
  cba: 118_400_000,
  anz: 41_030_000,

  // Posted August cash movement.
  augustReceipts: 2_841_000,
  augustOutgoings: 1_987_000,

  // Arrears: Nguyen 200 + Patel 690 + Okafor 350.
  arrears: 124_000,
} as const;

const EXPECTED_ASSETS =
  FIXTURE.comptonRd +
  FIXTURE.bentonSt +
  FIXTURE.watsonRd +
  FIXTURE.miansRd +
  FIXTURE.loganReserve +
  FIXTURE.receivable;

const EXPECTED_LIABILITIES = FIXTURE.macquarie + FIXTURE.cba + FIXTURE.anz;
const EXPECTED_NET_WORTH = EXPECTED_ASSETS - EXPECTED_LIABILITIES;

describe('UAT-05 · dashboard reconciles to independent fixtures', () => {
  it('matches assets to the cent', () => {
    expect(dashboardService.totalAssets(asOf).cents).toBe(EXPECTED_ASSETS);
    expect(EXPECTED_ASSETS).toBe(437_000_000); // $4,370,000
  });

  it('matches liabilities to the cent, excluding the receivable (FR-11)', () => {
    expect(dashboardService.totalLiabilities().cents).toBe(EXPECTED_LIABILITIES);
    expect(EXPECTED_LIABILITIES).toBe(220_670_000); // $2,206,700
    // The receivable must not be inside the liability total.
    expect(EXPECTED_LIABILITIES).not.toBe(220_670_000 + FIXTURE.receivable);
  });

  it('matches net worth to the cent (BR-01)', () => {
    expect(dashboardService.netWorth(asOf).netWorth.cents).toBe(EXPECTED_NET_WORTH);
    expect(EXPECTED_NET_WORTH).toBe(216_330_000); // $2,163,300
  });

  it('matches August cash flow to the cent (BR-03)', () => {
    const position = dashboardService.financialPosition(asOf);

    expect(position.periodFrom).toBe('2026-08-01');
    expect(position.periodTo).toBe('2026-08-31');
    expect(position.cashFlow.receipts.cents).toBe(FIXTURE.augustReceipts);
    expect(position.cashFlow.outgoings.cents).toBe(FIXTURE.augustOutgoings);
    expect(position.cashFlow.net.cents).toBe(FIXTURE.augustReceipts - FIXTURE.augustOutgoings);
  });

  it('matches arrears to the cent (BR-05)', () => {
    expect(leasesService.arrearsSummary(asOf).total.cents).toBe(FIXTURE.arrears);
  });

  it('does not inflate wealth through duplicate ownership paths (BR-02)', () => {
    const positions = dashboardService.ownershipPositions(asOf);
    const summed = positions.reduce((total, position) => total + position.net.cents, 0);

    // If a company's equity were added on top of its properties, this would
    // exceed the independently calculated net worth.
    expect(summed).toBe(EXPECTED_NET_WORTH);
  });

  it('does not inflate income with internal transfers (BR-03)', () => {
    const excluded = dashboardService.financialPosition(asOf).cashFlow.excludedTransfers;

    // The $5,000 own-account transfer is excluded from both sides, and reported
    // so the omission is visible rather than silent.
    expect(excluded.cents).toBeGreaterThanOrEqual(500_000);
  });

  it('keeps the cash-flow chart consistent with the month KPIs', () => {
    const chart = dashboardService.cashFlow(asOf);
    const august = chart[chart.length - 1];
    const summary = dashboardService.monthlyCashSummary(asOf);

    expect(august?.receipts.cents).toBe(summary?.receipts.cents);
    expect(august?.outgoings.cents).toBe(summary?.outgoings.cents);
    expect(august?.receipts.cents).toBe(FIXTURE.augustReceipts);
  });
});
