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

import { addComponentAction, createPropertyAction, updatePropertyAction } from '@/modules/properties/actions';
import { accessService } from '@/modules/access/service';
import { dashboardService } from '@/modules/dashboard/service';
import type { Property, PropertyComponent } from '@/modules/properties/model';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';
import { propertyLinksService } from '@/modules/dashboard/property-links';
import { propertiesService } from '@/modules/properties/service';
import { propertiesRepository } from '@/modules/properties/repository';
import { loansService } from '@/modules/loans/service';
import { obligationsService } from '@/modules/obligations/service';
import { documentsRepository } from '@/modules/documents/repository';
import { PROPERTY_IDS } from '@/modules/properties/data/seed';
import { ENTITY_IDS } from '@/modules/entities/data/seed';
import { fromMajorUnits } from '@/shared/lib/money';
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

describe('FR-02 · purchase price, settlement costs and capital growth', () => {
  const idle = IDLE_RESULT as ActionResult<unknown>;

  function formOf(fields: Record<string, string>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    return form;
  }

  it('measures growth against purchase price plus settlement costs', () => {
    // Hand-derived: Compton Rd cost 812,000 + 34,500 = 846,500 and is valued at
    // 1,180,000, so growth is 333,500 — not the 368,000 that ignoring costs gives.
    const growth = propertiesService.capitalGrowth(PROPERTY_IDS.comptonRd, asOf);

    expect(growth.purchasePrice).toEqual(fromMajorUnits(812_000));
    expect(growth.settlementCosts).toEqual(fromMajorUnits(34_500));
    expect(growth.settledOn).toBe('2021-03-12');
    expect(growth.totalCostBasis).toEqual(fromMajorUnits(846_500));
    expect(growth.currentValuation).toEqual(fromMajorUnits(1_180_000));
    expect(growth.growthAmount).toEqual(fromMajorUnits(333_500));
    expect(growth.growthPercent).toBeCloseTo(333_500 / 846_500, 10);
    expect(growth.growthPercent).toBeGreaterThan(0);
  });

  it('uses the valuation current at the as-of date, not a later one', () => {
    // On 2025-01-01 the newest Compton Rd valuation is the July 2024 bank figure.
    const growth = propertiesService.capitalGrowth(PROPERTY_IDS.comptonRd, '2025-01-01');

    expect(growth.currentValuation).toEqual(fromMajorUnits(1_040_000));
    expect(growth.growthAmount).toEqual(fromMajorUnits(193_500));
  });

  it('reports a loss when the valuation has not covered settlement costs', () => {
    // Mians Rd is still carried at its 760,000 purchase price, so the 28,000 of
    // settlement costs shows up as negative growth.
    const growth = propertiesService.capitalGrowth(PROPERTY_IDS.miansRd, asOf);

    expect(growth.totalCostBasis).toEqual(fromMajorUnits(788_000));
    expect(growth.growthAmount).toEqual(fromMajorUnits(-28_000));
    expect(growth.growthPercent).toBeLessThan(0);
  });

  it('returns nulls, never zeros, when no purchase price is recorded', () => {
    const growth = propertiesService.capitalGrowth(PROPERTY_IDS.loganReserve, asOf);

    expect(growth.purchasePrice).toBeNull();
    expect(growth.totalCostBasis).toBeNull();
    expect(growth.currentValuation).toEqual(fromMajorUnits(318_000));
    expect(growth.growthAmount).toBeNull();
    expect(growth.growthPercent).toBeNull();
  });

  it('persists purchase price and settlement costs when a property is created', async () => {
    const result = await createPropertyAction(
      idle,
      formOf({
        name: '14 Watson Rd, Acacia Ridge',
        ownerEntityId: ENTITY_IDS.familyTrust,
        settledOn: '2021-03-15',
        purchasePrice: '$760,000',
        settlementCosts: '28,000.00',
      }),
    );

    if (!result.ok) throw new Error(`expected success, got: ${result.message}`);
    const created = result.value as Property;
    const stored = propertiesRepository.find(created.id);

    expect(stored?.purchasePrice).toEqual(fromMajorUnits(760_000));
    expect(stored?.settlementCosts).toEqual(fromMajorUnits(28_000));
    expect(stored?.settledOn).toBe('2021-03-15');

    // No valuation yet: the basis is known, the growth is not.
    const growth = propertiesService.capitalGrowth(created.id, asOf);
    expect(growth.totalCostBasis).toEqual(fromMajorUnits(788_000));
    expect(growth.growthAmount).toBeNull();
  });

  it('leaves the cost fields absent when the form omits them', async () => {
    const result = await createPropertyAction(
      idle,
      formOf({ name: '9 Example St', ownerEntityId: ENTITY_IDS.familyTrust, purchasePrice: '', settlementCosts: '' }),
    );

    if (!result.ok) throw new Error(`expected success, got: ${result.message}`);
    const stored = propertiesRepository.find((result.value as Property).id);
    expect(stored?.purchasePrice).toBeUndefined();
    expect(stored?.settlementCosts).toBeUndefined();
  });

  it('rejects a purchase price of zero and marks the field', async () => {
    const before = propertiesRepository.list().length;
    const result = await createPropertyAction(
      idle,
      formOf({ name: '9 Example St', ownerEntityId: ENTITY_IDS.familyTrust, purchasePrice: '0' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.purchasePrice).toBeDefined();
    expect(propertiesRepository.list()).toHaveLength(before);
  });
});

describe('FR-02 · editing a property', () => {
  const idle = IDLE_RESULT as ActionResult<unknown>;

  function formOf(fields: Record<string, string>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    return form;
  }

  // Each test edits a property of its own, so the seeded ones stay as the other
  // suites expect them.
  async function freshProperty(): Promise<Property> {
    const result = await createPropertyAction(
      idle,
      formOf({ name: '21 Edit St', ownerEntityId: ENTITY_IDS.familyTrust, purchasePrice: '500,000' }),
    );
    if (!result.ok) throw new Error(`expected success, got: ${result.message}`);
    return result.value as Property;
  }

  it('updates name, address, status and rental mode', async () => {
    const property = await freshProperty();
    const result = await updatePropertyAction(
      idle,
      formOf({
        propertyId: property.id,
        name: '21 Edit St, Sunnybank',
        fullAddress: '21 Edit Street, Sunnybank QLD 4109',
        status: 'vacant',
        rentalMode: 'by-room',
      }),
    );

    if (!result.ok) throw new Error(`expected success, got: ${result.message}`);
    expect(propertiesRepository.find(property.id)).toMatchObject({
      name: '21 Edit St, Sunnybank',
      fullAddress: '21 Edit Street, Sunnybank QLD 4109',
      status: 'vacant',
      rentalMode: 'by-room',
    });
  });

  it('leaves ownership and cost basis untouched', async () => {
    const property = await freshProperty();
    const result = await updatePropertyAction(
      idle,
      formOf({ propertyId: property.id, name: 'Renamed', fullAddress: 'Renamed address', status: 'own-home', rentalMode: 'not-rented' }),
    );
    expect(result.ok).toBe(true);

    const stored = propertiesRepository.find(property.id);
    expect(stored?.purchasePrice).toEqual(fromMajorUnits(500_000));
    expect(stored?.ownershipLabel).toBe(property.ownershipLabel);
    expect(stored?.holdingNote).toBe(property.holdingNote);
    expect(stored?.consolidationMethodChosen).toBe(false);
  });

  it('records an audit entry naming what changed', async () => {
    const property = await freshProperty();
    const before = accessService.listAuditEvents().length;

    const result = await updatePropertyAction(
      idle,
      formOf({ propertyId: property.id, name: 'Audit House', fullAddress: property.fullAddress, status: 'vacant', rentalMode: property.rentalMode }),
    );
    expect(result.ok).toBe(true);

    const events = accessService.listAuditEvents();
    expect(events).toHaveLength(before + 1);
    const event = events.find((entry) => entry.summary === 'Property updated · Audit House');
    expect(event).toBeDefined();
    expect(event?.context).toContain('name: 21 Edit St → Audit House');
    expect(event?.context).toContain('status: rented → vacant');
    expect(event?.context).not.toContain('rentalMode');
  });

  it('rejects an empty name, marks the field and changes nothing', async () => {
    const property = await freshProperty();
    const before = accessService.listAuditEvents().length;
    const result = await updatePropertyAction(
      idle,
      formOf({ propertyId: property.id, name: '  ', fullAddress: 'Somewhere', status: 'vacant', rentalMode: 'whole' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.name).toBeDefined();
    expect(propertiesRepository.find(property.id)).toEqual(property);
    expect(accessService.listAuditEvents()).toHaveLength(before);
  });

  it('rejects an unrecognised status and changes nothing', async () => {
    const property = await freshProperty();
    const result = await updatePropertyAction(
      idle,
      formOf({ propertyId: property.id, name: property.name, fullAddress: property.fullAddress, status: 'demolished', rentalMode: 'whole' }),
    );

    expect(result.ok).toBe(false);
    expect(propertiesRepository.find(property.id)).toEqual(property);
  });

  it('refuses an unknown property', async () => {
    const result = await updatePropertyAction(
      idle,
      formOf({ propertyId: 'prop-nope', name: 'X', fullAddress: 'Y', status: 'vacant', rentalMode: 'whole' }),
    );
    expect(result.ok).toBe(false);
  });
});
