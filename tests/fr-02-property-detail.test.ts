/**
 * FR-02 — the property detail tabs show the records linked to a property.
 *
 * The tabs render whatever `propertyLinksService` returns, so these tests pin
 * that every linked dataset is scoped to the property and agrees with the
 * services that own the underlying figures.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Actions call revalidatePath, which needs a request scope that does not exist
// in a unit test. The cache behaviour is Next's; what matters here is the write.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { addComponentAction } from '@/modules/properties/actions';
import { dashboardService } from '@/modules/dashboard/service';
import type { PropertyComponent } from '@/modules/properties/model';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';
import { propertyLinksService } from '@/modules/dashboard/property-links';
import { propertiesService } from '@/modules/properties/service';
import { propertiesRepository } from '@/modules/properties/repository';
import { loansService } from '@/modules/loans/service';
import { obligationsService } from '@/modules/obligations/service';
import { documentsRepository } from '@/modules/documents/repository';
import { PROPERTY_IDS } from '@/modules/properties/data/seed';
import { resolveAsOfDate } from '@/shared/config/app-config';

const asOf = resolveAsOfDate();

describe('FR-02 · property detail linked records', () => {
  it.each(propertiesService.list().map((property) => [property.name, property.id] as const))(
    'scopes every dataset to %s',
    (_name, propertyId) => {
      const links = propertyLinksService.forProperty(propertyId, asOf);

      expect(links.valuations.map((row) => row.id).sort()).toEqual(
        propertiesRepository.listValuations(propertyId).map((valuation) => valuation.id).sort(),
      );
      expect(links.loans.map((row) => row.id).sort()).toEqual(
        loansService.list().filter((loan) => loan.security.propertyIds.includes(propertyId)).map((loan) => loan.id).sort(),
      );
      expect(links.obligations.map((row) => row.id).sort()).toEqual(
        obligationsService.list().filter((obligation) => obligation.propertyId === propertyId).map((o) => o.id).sort(),
      );
      expect(links.documents.map((row) => row.id).sort()).toEqual(
        documentsRepository
          .list()
          .filter((record) => record.links.some((link) => link.type === 'property' && link.propertyId === propertyId))
          .map((record) => record.id)
          .sort(),
      );
    },
  );

  it('renders Compton Rd with valuations, loans, obligations and documents', () => {
    const links = propertyLinksService.forProperty(PROPERTY_IDS.comptonRd, asOf);

    expect(links.valuations.length).toBeGreaterThan(0);
    expect(links.loans.length).toBeGreaterThan(0);
    expect(links.obligations.length).toBeGreaterThan(0);
    expect(links.documents.length).toBeGreaterThan(0);
  });

  it('lists valuations newest first and marks exactly the current one', () => {
    const { valuations, overview } = propertyLinksService.forProperty(PROPERTY_IDS.comptonRd, asOf);
    const current = valuations.filter((row) => row.isCurrent);

    expect(current).toHaveLength(1);
    expect(valuations[0]).toBe(current[0]);
    expect(overview.valuationAmount).toEqual(current[0]?.amount);
  });

  it('takes overview debt from the loans service and never prints a pooled LVR (BR-04)', () => {
    const { overview } = propertyLinksService.forProperty(PROPERTY_IDS.comptonRd, asOf);

    expect(overview.totalDebt).toEqual(loansService.debtForProperty(PROPERTY_IDS.comptonRd)?.amount);
    expect(overview.debtNote).toMatch(/Provisional/);
    expect(overview.lvrLabel).toBe('Pool only · allocation policy needed');
  });

  it('publishes an LVR percentage for a solely-secured property with a current valuation', () => {
    const lvr = loansService.propertyLvr(PROPERTY_IDS.watsonRd, asOf);
    const { overview } = propertyLinksService.forProperty(PROPERTY_IDS.watsonRd, asOf);

    if (lvr.available) expect(overview.lvrLabel).toMatch(/^\d+\.\d%$/);
    else expect(overview.lvrLabel).not.toMatch(/%$/);
  });
});

describe('FR-02 / BR-02 · adding a room or component', () => {
  const idle = IDLE_RESULT as ActionResult<unknown>;

  function formOf(fields: Record<string, string>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    return form;
  }

  beforeEach(() => {
    propertiesRepository.resetComponents();
  });

  it('rejects an empty label and marks the field', async () => {
    const before = propertiesRepository.listComponents(PROPERTY_IDS.miansRd).length;
    const result = await addComponentAction(idle, formOf({ propertyId: PROPERTY_IDS.miansRd, label: '  ' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.label).toBeDefined();
    expect(propertiesRepository.listComponents(PROPERTY_IDS.miansRd)).toHaveLength(before);
  });

  it('creates a room after the highest existing position', async () => {
    const existing = propertiesRepository.listComponents(PROPERTY_IDS.miansRd);
    const highest = Math.max(0, ...existing.map((component) => component.position));

    const result = await addComponentAction(
      idle,
      formOf({ propertyId: PROPERTY_IDS.miansRd, label: 'Granny Flat', isVacant: 'on' }),
    );

    if (!result.ok) throw new Error(`expected success, got: ${result.message}`);
    const created = result.value as PropertyComponent;
    expect(created).toMatchObject({ label: 'Granny Flat', kind: 'room', position: highest + 1, vacantSince: asOf });

    const after = propertiesRepository.listComponents(PROPERTY_IDS.miansRd);
    expect(after).toHaveLength(existing.length + 1);
    expect(after.at(-1)?.id).toBe(created.id);
  });

  it('refuses a label already in use on the property, whatever its case', async () => {
    const before = propertiesRepository.listComponents(PROPERTY_IDS.comptonRd).length;
    const result = await addComponentAction(idle, formOf({ propertyId: PROPERTY_IDS.comptonRd, label: 'room 4' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.label).toBeDefined();
    expect(propertiesRepository.listComponents(PROPERTY_IDS.comptonRd)).toHaveLength(before);
  });

  it('allows the same label on a different property', async () => {
    const result = await addComponentAction(idle, formOf({ propertyId: PROPERTY_IDS.miansRd, label: 'Room 4' }));
    expect(result.ok).toBe(true);
  });

  it('refuses a second whole-property component', async () => {
    const result = await addComponentAction(
      idle,
      formOf({ propertyId: PROPERTY_IDS.miansRd, label: 'Main house', kind: 'whole' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.kind).toBeDefined();
  });

  it('refuses an unknown property', async () => {
    const result = await addComponentAction(idle, formOf({ propertyId: 'prop-nope', label: 'Room 1' }));
    expect(result.ok).toBe(false);
  });

  it('counts a newly added vacant room as vacant, not let', async () => {
    const before = propertiesService.occupancy(PROPERTY_IDS.comptonRd, asOf);
    const result = await addComponentAction(
      idle,
      formOf({ propertyId: PROPERTY_IDS.comptonRd, label: 'Room 7', isVacant: 'true' }),
    );
    expect(result.ok).toBe(true);

    const after = propertiesService.occupancy(PROPERTY_IDS.comptonRd, asOf);
    expect(after.total).toBe(before.total + 1);
    expect(after.let).toBe(before.let);
    expect(after.vacant).toBe(before.vacant + 1);
  });

  it('leaves the asset valuation unchanged — a room is operational, not an asset (BR-02)', async () => {
    const valuationBefore = propertiesService.valuationStatus(PROPERTY_IDS.miansRd, asOf).valuation?.amount;
    const assetsBefore = dashboardService.totalAssets(asOf);

    const result = await addComponentAction(idle, formOf({ propertyId: PROPERTY_IDS.miansRd, label: 'Room 9' }));
    expect(result.ok).toBe(true);

    expect(propertiesService.valuationStatus(PROPERTY_IDS.miansRd, asOf).valuation?.amount).toEqual(valuationBefore);
    expect(dashboardService.totalAssets(asOf)).toEqual(assetsBefore);
  });
});
