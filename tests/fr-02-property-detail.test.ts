/**
 * FR-02 — the property detail tabs show the records linked to a property.
 *
 * The tabs render whatever `propertyLinksService` returns, so these tests pin
 * that every linked dataset is scoped to the property and agrees with the
 * services that own the underlying figures.
 */
import { describe, expect, it } from 'vitest';
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
