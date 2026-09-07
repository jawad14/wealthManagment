/**
 * UAT-01 — "Joint ownership, a corporate trustee, a home and a two-property
 * secured loan consolidate without duplicate assets/debt."
 *
 * BR-01 / BR-02 / FR-11.
 */
import { describe, expect, it } from 'vitest';
import { dashboardService } from '@/modules/dashboard/service';
import { entitiesService } from '@/modules/entities/service';
import { entitiesRepository } from '@/modules/entities/repository';
import { loansService } from '@/modules/loans/service';
import { loansRepository } from '@/modules/loans/repository';
import { propertiesService } from '@/modules/properties/service';
import { ENTITY_IDS, PROPERTY_IDS } from '@/modules/entities/data/seed';
import { isControlRelation, assertShareIntegrity } from '@/modules/entities/model';
import { resolveAsOfDate } from '@/shared/config/app-config';

const asOf = resolveAsOfDate();

describe('BR-02 / UAT-01 · consolidation without duplication', () => {
  it('sums every entity position exactly to net worth', () => {
    const positions = dashboardService.ownershipPositions(asOf);
    const netWorth = dashboardService.netWorth(asOf).netWorth;
    const summed = positions.reduce((total, position) => total + position.net.cents, 0);

    expect(summed).toBe(netWorth.cents);
  });

  it('counts a jointly-owned home once, split across both owners', () => {
    const owners = entitiesService.ownersOf(PROPERTY_IDS.watsonRd, asOf);

    expect(owners).toHaveLength(2);
    expect(owners.reduce((total, claim) => total + claim.share, 0)).toBeCloseTo(1, 10);
    expect(owners.map((claim) => claim.ownerEntityId).sort()).toEqual(
      [ENTITY_IDS.jawad, ENTITY_IDS.mahvish].sort(),
    );
  });

  it('keeps a non-rented principal residence as an asset (BR-01)', () => {
    const home = propertiesService.require(PROPERTY_IDS.watsonRd);
    expect(home.status).toBe('own-home');

    const status = propertiesService.valuationStatus(home.id, asOf);
    expect(status.valuation?.amount.cents).toBeGreaterThan(0);

    // It contributes to assets despite producing no rent.
    const claims = entitiesService.resolveOwnershipClaims(asOf);
    expect(claims.some((claim) => claim.propertyId === PROPERTY_IDS.watsonRd)).toBe(true);
  });

  it('does not let a corporate trustee inherit the trust’s assets', () => {
    // Esteem is trustee for the Family Trust. That relationship is control only.
    const trusteeLink = entitiesRepository
      .listRelationships()
      .find((relation) => relation.kind === 'trustee-of' && relation.subjectEntityId === ENTITY_IDS.esteem);

    expect(trusteeLink).toBeDefined();
    expect(isControlRelation(trusteeLink!.kind)).toBe(true);
    expect(trusteeLink!.sharePercent).toBeUndefined();

    // The trust's properties are attributed to the trust, not to its trustee.
    const comptonOwners = entitiesService.ownersOf(PROPERTY_IDS.comptonRd, asOf);
    expect(comptonOwners.map((claim) => claim.ownerEntityId)).toEqual([ENTITY_IDS.familyTrust]);
  });

  it('never assigns a percentage from beneficiary status alone (BR-02)', () => {
    const beneficiaryLinks = entitiesRepository
      .listRelationships()
      .filter((relation) => relation.kind === 'beneficiary-of');

    expect(beneficiaryLinks.length).toBeGreaterThan(0);
    for (const link of beneficiaryLinks) {
      expect(link.sharePercent).toBeUndefined();
    }
  });

  it('rejects a control relationship that carries an ownership share', () => {
    expect(() =>
      assertShareIntegrity({
        id: 'bad-relation',
        subjectEntityId: ENTITY_IDS.jawad,
        kind: 'beneficiary-of',
        target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
        sharePercent: 50,
        from: '2020-01-01',
        to: null,
        label: 'Beneficiary with an invented share',
      }),
    ).toThrow(/BR-02/);
  });

  it('counts a two-property secured loan once in total liabilities', () => {
    const pooled = loansRepository.list().find((loan) => loan.security.kind === 'pool');
    expect(pooled).toBeDefined();
    expect(pooled!.security.propertyIds.length).toBe(2);

    const liabilities = loansRepository.listLiabilities();
    const summed = liabilities.reduce((total, loan) => total + loan.balance.cents, 0);

    // The pooled facility appears once in the total, not once per property.
    expect(loansService.totalDebt().cents).toBe(summed);
    expect(liabilities.filter((loan) => loan.id === pooled!.id)).toHaveLength(1);
  });

  it('excludes receivables from debt and includes them in assets (FR-11)', () => {
    const receivables = loansRepository.listReceivables();
    expect(receivables.length).toBeGreaterThan(0);

    const debtIncludesReceivable = loansRepository
      .listLiabilities()
      .some((loan) => loan.direction === 'receivable');
    expect(debtIncludesReceivable).toBe(false);

    const assets = dashboardService.totalAssets(asOf);
    const receivableTotal = loansService.totalReceivables();
    expect(assets.cents).toBeGreaterThanOrEqual(receivableTotal.cents);
  });

  it('reconciles net worth as assets minus liabilities exactly (BR-01)', () => {
    const breakdown = dashboardService.netWorth(asOf);
    expect(breakdown.netWorth.cents).toBe(breakdown.assets.cents - breakdown.liabilities.cents);
  });

  it('does not count a property twice when an entity owns it and is itself held', () => {
    // Every property appears in exactly one owner set.
    const claims = entitiesService.resolveOwnershipClaims(asOf);
    const byProperty = new Map<string, number>();
    for (const claim of claims) {
      byProperty.set(claim.propertyId, (byProperty.get(claim.propertyId) ?? 0) + claim.share);
    }
    for (const [propertyId, share] of byProperty) {
      expect(share, `property ${propertyId} is over-allocated`).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
