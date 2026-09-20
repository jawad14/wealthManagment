/**
 * FR-01 / BR-02 — recording a relationship through the "+ Add relationship" form.
 *
 * The action is called with a FormData shaped exactly as the form submits it:
 * one target field, and `sharePercent` only when the relationship is ownership.
 */
import { describe, expect, it, vi } from 'vitest';

// revalidatePath needs a request scope that does not exist in a unit test.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createRelationshipAction } from '@/modules/entities/actions';
import { entitiesRepository } from '@/modules/entities/repository';
import { entitiesService } from '@/modules/entities/service';
import { dashboardService } from '@/modules/dashboard/service';
import { ENTITY_IDS, PROPERTY_IDS } from '@/modules/entities/data/seed';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { NotFoundError } from '@/shared/lib/errors';
import { fromMajorUnits } from '@/shared/lib/money';
import { asId } from '@/shared/types/common';

const idle = IDLE_RESULT as ActionResult<unknown>;
const asOf = resolveAsOfDate();

/** Build a FormData the way a browser would. */
function formOf(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

describe('FR-01 / BR-02 · createRelationshipAction', () => {
  it('refuses an ownership relationship with no share', async () => {
    const before = entitiesRepository.listRelationships().length;

    const result = await createRelationshipAction(
      idle,
      formOf({
        subjectEntityId: ENTITY_IDS.jawad,
        kind: 'owns',
        targetType: 'property',
        targetPropertyId: PROPERTY_IDS.miansRd,
        from: '2026-01-01',
        label: 'Owns · Mians Rd',
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.sharePercent).toBeDefined();
    expect(entitiesRepository.listRelationships()).toHaveLength(before);
  });

  it('refuses a share on a director link (BR-02)', async () => {
    const before = entitiesRepository.listRelationships().length;

    const result = await createRelationshipAction(
      idle,
      formOf({
        subjectEntityId: ENTITY_IDS.mahvish,
        kind: 'director-of',
        targetType: 'entity',
        targetEntityId: ENTITY_IDS.esteem,
        sharePercent: '50',
        from: '2026-01-01',
        label: 'Director with an invented share',
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/BR-02/);
      expect(result.fieldErrors?.sharePercent).toBeDefined();
    }
    expect(entitiesRepository.listRelationships()).toHaveLength(before);
  });

  it('records an ownership relationship and consolidation still reconciles', async () => {
    // Every seeded property is already fully allocated, so the new holding is a
    // share in a company — which must not create a second claim on its properties.
    const claimsBefore = entitiesService.resolveOwnershipClaims(asOf);
    const netWorthBefore = dashboardService.netWorth(asOf).netWorth.cents;

    const result = await createRelationshipAction(
      idle,
      formOf({
        subjectEntityId: ENTITY_IDS.mahvish,
        kind: 'owns',
        targetType: 'entity',
        targetEntityId: ENTITY_IDS.esteem,
        sharePercent: '50',
        from: '2026-01-01',
        label: '50% Shareholder · Esteem',
      }),
    );

    expect(result.ok).toBe(true);

    const stored = entitiesRepository
      .listRelationshipsForEntity(ENTITY_IDS.mahvish, asOf)
      .find((relation) => relation.label === '50% Shareholder · Esteem');
    expect(stored).toBeDefined();
    expect(stored!.kind).toBe('owns');
    expect(stored!.sharePercent).toBe(50);
    expect(stored!.target).toEqual({ type: 'entity', entityId: ENTITY_IDS.esteem });

    // Re-run consolidation: no duplicate assets, and positions still sum to net worth.
    expect(entitiesService.resolveOwnershipClaims(asOf)).toEqual(claimsBefore);

    const positions = dashboardService.ownershipPositions(asOf);
    const netWorth = dashboardService.netWorth(asOf).netWorth.cents;
    expect(positions.reduce((total, position) => total + position.net.cents, 0)).toBe(netWorth);
    expect(netWorth).toBe(netWorthBefore);
  });
});

/**
 * Hand-derived from the seed, not from the code:
 *  - Watson Rd is valued at $1,052,000 and held 50/50; Macquarie 4417 ($612,400)
 *    names both owners as borrowers.
 *  - The Family Trust owns Compton Rd ($1,180,000) and Mians Rd ($760,000)
 *    outright and borrows ANZ 3305 ($410,300) against Mians Rd.
 *  - Esteem owns Benton St ($940,000) and Lot 12 ($318,000) and borrows CBA 8820
 *    ($1,184,000), pooled equally over Compton Rd and Benton St.
 */
describe('FR-01 / BR-02 · entityHoldings', () => {
  const dollars = (amount: number) => fromMajorUnits(amount);

  it('attributes half of a jointly-owned property and half of its joint loan', () => {
    for (const owner of [ENTITY_IDS.jawad, ENTITY_IDS.mahvish]) {
      const result = dashboardService.entityHoldings(owner, asOf);

      expect(result.holdings).toEqual([
        {
          propertyId: PROPERTY_IDS.watsonRd,
          propertyName: 'Watson Rd, Acacia Ridge',
          sharePercent: 50,
          attributedValue: dollars(526_000),
          debt: dollars(306_200),
        },
      ]);
      expect(result.grossAssets).toEqual(dollars(526_000));
      expect(result.attributedDebt).toEqual(dollars(306_200));
      expect(result.netEquity).toEqual(dollars(219_800));
    }
  });

  it('attributes the whole value and debt of solely-owned properties', () => {
    const result = dashboardService.entityHoldings(ENTITY_IDS.familyTrust, asOf);
    const byProperty = new Map(result.holdings.map((holding) => [holding.propertyId, holding]));

    expect(result.holdings).toHaveLength(2);
    expect(byProperty.get(PROPERTY_IDS.comptonRd)?.sharePercent).toBe(100);
    expect(byProperty.get(PROPERTY_IDS.comptonRd)?.attributedValue).toEqual(dollars(1_180_000));
    // Compton Rd secures Esteem's facility, not the trust's — no debt lands here.
    expect(byProperty.get(PROPERTY_IDS.comptonRd)?.debt).toEqual(dollars(0));
    expect(byProperty.get(PROPERTY_IDS.miansRd)?.attributedValue).toEqual(dollars(760_000));
    expect(byProperty.get(PROPERTY_IDS.miansRd)?.debt).toEqual(dollars(410_300));

    expect(result.grossAssets).toEqual(dollars(1_940_000));
    expect(result.attributedDebt).toEqual(dollars(410_300));
    expect(result.netEquity).toEqual(dollars(1_529_700));
  });

  it('keeps a borrower liable for pooled debt secured on a property it does not own', () => {
    const result = dashboardService.entityHoldings(ENTITY_IDS.esteem, asOf);
    const benton = result.holdings.find((holding) => holding.propertyId === PROPERTY_IDS.bentonSt);

    expect(benton?.debt).toEqual(dollars(592_000));
    expect(result.grossAssets).toEqual(dollars(1_258_000));
    expect(result.attributedDebt).toEqual(dollars(1_184_000));
    expect(result.netEquity).toEqual(dollars(74_000));
  });

  it('reconciles with the consolidated positions: every dollar of debt appears once', () => {
    const entities = entitiesService.listEntities();
    const all = entities.map((entity) => dashboardService.entityHoldings(entity.id, asOf));

    const debt = all.reduce((total, result) => total + result.attributedDebt.cents, 0);
    expect(debt).toBe(dashboardService.totalLiabilities().cents);

    entities.forEach((entity, index) => {
      expect(all[index]!.attributedDebt).toEqual(dashboardService.positionOf(asOf, entity.id).liabilities);
    });
  });

  it('returns an empty balance sheet for an entity with no interests, and refuses an unknown one', () => {
    const result = dashboardService.entityHoldings(ENTITY_IDS.hassan, asOf);
    expect(result.holdings).toEqual([]);
    expect(result.netEquity).toEqual(dollars(0));

    expect(() => dashboardService.entityHoldings(asId<'Entity'>('ent-nobody'), asOf)).toThrow(NotFoundError);
  });
});
