/**
 * UAT-07 — "Stale valuations, missing due dates and unmatched transactions are
 * clearly flagged."
 *
 * BR-04 — "A zero/missing denominator returns unavailable, never zero risk."
 */
import { describe, expect, it } from 'vitest';
import { propertiesService } from '@/modules/properties/service';
import { loansService } from '@/modules/loans/service';
import { reconciliationService } from '@/modules/reconciliation/service';
import { obligationsService } from '@/modules/obligations/service';
import { dashboardService } from '@/modules/dashboard/service';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import { LOAN_IDS } from '@/modules/loans/data/seed';
import { resolveAsOfDate } from '@/shared/config/app-config';

const asOf = resolveAsOfDate();

describe('UAT-07 · data-quality flags', () => {
  it('flags stale valuations and still shows their last known value', () => {
    const stale = propertiesService.staleValuationProperties(asOf);
    expect(stale.length).toBeGreaterThan(0);

    for (const property of stale) {
      const status = propertiesService.valuationStatus(property.id, asOf);
      expect(status.isStale).toBe(true);
      expect(status.label).toContain('stale');
      // The asset is not lost from the portfolio just because the figure aged.
      expect(status.valuation?.amount.cents).toBeGreaterThan(0);
      expect(status.eligibleForRatios).toBe(false);
    }
  });

  it('returns Unavailable, never zero, when collateral has no eligible valuation (BR-04)', () => {
    const lvr = loansService.facilityLvr(LOAN_IDS.anz3305, asOf);

    expect(lvr.available).toBe(false);
    if (!lvr.available) expect(lvr.reason).toBe('stale-valuation');
  });

  it('withholds a pooled per-property LVR until the allocation policy is approved', () => {
    const lvr = loansService.facilityLvr(LOAN_IDS.cba8820, asOf);

    expect(lvr.available).toBe(false);
    if (!lvr.available) expect(lvr.reason).toBe('pool-without-policy');
  });

  it('still computes a single-property LVR where the valuation is current', () => {
    const lvr = loansService.facilityLvr(LOAN_IDS.macquarie4417, asOf);

    expect(lvr.available).toBe(true);
    if (lvr.available) expect(lvr.value).toBeCloseTo(0.582, 3);
  });

  it('reports portfolio LVR as unavailable rather than understating gearing', () => {
    const lvr = loansService.portfolioLvr(asOf);

    expect(lvr.available).toBe(false);
    if (!lvr.available) expect(lvr.reason).toMatch(/without an eligible valuation/);
  });

  it('flags unmatched transactions and keeps them unposted', () => {
    const unmatched = reconciliationService.unmatchedCount();
    expect(unmatched).toBe(4);
    expect(reconciliationService.unmatchedValue().cents).toBe(312_000);

    const current = reconciliationService.currentImport();
    const rows = reconciliationService.listTransactions(current!.id, 'unmatched');
    for (const row of rows) {
      expect(row.state).toBe('unmatched');
      expect(row.suggestion).toBeNull();
    }
  });

  it('flags an obligation with no owner as ineligible for reminders', () => {
    const unowned = obligationsService.listViews(asOf, 'no-owner');

    expect(unowned.length).toBeGreaterThan(0);
    for (const view of unowned) {
      expect(view.ineligibility).toBe('no-owner');
      expect(view.statusLabel).toBe('Not eligible for reminders');
    }
  });

  it('surfaces every data-quality gap on the dashboard attention strip', () => {
    const items = dashboardService.attentionItems(asOf);
    const ids = items.map((item) => item.id);

    expect(ids).toContain('stale-valuations');
    expect(ids).toContain('unmatched-transactions');
    expect(ids).toContain('overdue-obligations');
    expect(ids.some((id) => id.startsWith('ownership-gap-'))).toBe(true);
  });

  it('flags a property whose consolidation method has not been chosen', () => {
    const gaps = propertiesService.ownershipGaps(asOf);
    const watson = gaps.find((gap) => gap.propertyId === PROPERTY_IDS.watsonRd);

    expect(watson).toBeDefined();
    expect(watson!.reason).toBe('consolidation method not chosen');
  });

  it('never renders a missing ratio as a number', () => {
    // Every unavailable ratio carries a reason string, so a caller cannot
    // accidentally coerce it to 0.
    for (const loanId of Object.values(LOAN_IDS)) {
      const lvr = loansService.facilityLvr(loanId, asOf);
      if (!lvr.available) {
        expect(typeof lvr.reason).toBe('string');
        expect(lvr.reason.length).toBeGreaterThan(0);
        expect(lvr).not.toHaveProperty('value');
      }
    }
  });
});
