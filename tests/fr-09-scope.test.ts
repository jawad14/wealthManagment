/**
 * FR-09 — scope switching.
 *
 * Scoping the dashboard to one entity must show that entity's attributed share
 * and nothing else, and the scoped views must add back up to the consolidated
 * total — otherwise the switcher would be inventing or losing money.
 */
import { describe, expect, it } from 'vitest';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { sumMoney } from '@/shared/lib/money';
import { dashboardService } from '@/modules/dashboard/service';
import { dashboardApi } from '@/modules/dashboard/api';
import { entitiesService } from '@/modules/entities/service';

const asOf = resolveAsOfDate();

describe('FR-09 scope switcher', () => {
  it('offers every consolidated entity and no manual-summary entity', () => {
    const offered = dashboardService.scopeOptions().map((option) => option.entityId);
    expect(offered).toEqual(entitiesService.consolidatedEntityIds());
    expect(offered.length).toBeGreaterThan(0);

    const manual = entitiesService.consolidatedEntityIds('manual-summary');
    manual.forEach((id) => expect(offered).not.toContain(id));
  });

  it('resolves an absent, unknown or non-consolidated id to the whole portfolio', () => {
    expect(dashboardService.resolveScope(undefined)).toBeNull();
    expect(dashboardService.resolveScope('')).toBeNull();
    expect(dashboardService.resolveScope('no-such-entity')).toBeNull();
    entitiesService
      .consolidatedEntityIds('manual-summary')
      .forEach((id) => expect(dashboardService.resolveScope(id)).toBeNull());
  });

  it('scopes net worth to the entity position from the ownership view', () => {
    dashboardService.ownershipPositions(asOf).forEach((position) => {
      const scoped = dashboardService.netWorth(asOf, position.entityId);
      expect(scoped.assets.cents).toBe(position.assets.cents);
      expect(scoped.liabilities.cents).toBe(position.liabilities.cents);
      expect(scoped.netWorth.cents).toBe(position.net.cents);
    });
  });

  it('scoped net worth across all entities adds back to the consolidated total', () => {
    const scoped = dashboardService
      .scopeOptions()
      .map((option) => dashboardService.netWorth(asOf, option.entityId).netWorth);
    const consolidated = dashboardService.netWorth(asOf).netWorth;
    // Even splits of a jointly held facility may shed a cent per co-borrower.
    expect(Math.abs(sumMoney(scoped).cents - consolidated.cents)).toBeLessThanOrEqual(scoped.length);
  });

  it('reports no snapshot movement when scoped, because snapshots are portfolio-wide', () => {
    const [first] = dashboardService.scopeOptions();
    expect(dashboardService.netWorth(asOf).movement).not.toBeNull();
    expect(dashboardService.netWorth(asOf, first!.entityId).movement).toBeNull();
  });

  it('narrows the ownership view to the scoped entity and keeps its portfolio share', () => {
    const all = dashboardService.ownershipPositions(asOf);
    const target = all[0]!;
    const scoped = dashboardService.ownershipPositions(asOf, target.entityId);
    expect(scoped).toHaveLength(1);
    expect(scoped[0]).toEqual(target);
  });

  it('returns zeros, not an error, for a consolidated entity that holds nothing', () => {
    const holders = new Set(dashboardService.ownershipPositions(asOf).map((position) => position.entityId));
    const empty = dashboardService.scopeOptions().find((option) => !holders.has(option.entityId));
    if (!empty) return;
    const scoped = dashboardService.netWorth(asOf, empty.entityId);
    expect(scoped.netWorth.cents).toBe(0);
    expect(dashboardService.ownershipPositions(asOf, empty.entityId)).toHaveLength(0);
  });

  it('leaves the consolidated overview unchanged and carries the scope through the API', () => {
    const consolidated = dashboardApi.overview(asOf);
    expect(consolidated.scope).toBeNull();
    expect(consolidated.netWorth).toEqual(dashboardService.netWorth(asOf));

    const option = dashboardService.scopeOptions()[0]!;
    const scoped = dashboardApi.overview(asOf, option.entityId);
    expect(scoped.scope).toEqual(option);
    expect(scoped.netWorth).toEqual(dashboardService.netWorth(asOf, option.entityId));
    // Figures with no entity dimension stay whole-portfolio.
    expect(scoped.arrears).toEqual(consolidated.arrears);
    expect(scoped.cashFlow).toEqual(consolidated.cashFlow);

    expect(dashboardApi.overview(asOf, 'no-such-entity').scope).toBeNull();
  });
});
