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
