/**
 * UAT-04 — "A delegate cannot retrieve restricted totals through direct URLs,
 * exports, search or document links."
 *
 * NFR-01 — "Deny by default; enforce record/entity permissions server-side."
 */
import { describe, expect, it } from 'vitest';
import { accessService } from '@/modules/access/service';
import { USER_IDS } from '@/modules/access/data/seed';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import { propertiesService } from '@/modules/properties/service';
import { ForbiddenError } from '@/shared/lib/errors';

describe('NFR-01 / UAT-04 · permission enforcement', () => {
  it('grants the portfolio owner whole-portfolio totals', () => {
    const scope = accessService.scopeFor(USER_IDS.jawad);

    expect(scope.scope).toBe('all');
    expect(() => accessService.requireCapability(scope, 'portfolio.totals.read')).not.toThrow();
  });

  it('denies an operations delegate the whole-portfolio totals', () => {
    const scope = accessService.scopeFor(USER_IDS.mahvish);

    expect(() => accessService.requireCapability(scope, 'portfolio.totals.read')).toThrow(ForbiddenError);
  });

  it('lets a delegate reach only their assigned properties', () => {
    const scope = accessService.scopeFor(USER_IDS.mahvish);

    expect(() => accessService.requireProperty(scope, PROPERTY_IDS.comptonRd)).not.toThrow();
    expect(() => accessService.requireProperty(scope, PROPERTY_IDS.bentonSt)).not.toThrow();
    // Watson Rd and Mians Rd are outside the grant — a direct id must not work.
    expect(() => accessService.requireProperty(scope, PROPERTY_IDS.watsonRd)).toThrow(ForbiddenError);
    expect(() => accessService.requireProperty(scope, PROPERTY_IDS.miansRd)).toThrow(ForbiddenError);
  });

  it('filters list results to the scope, so a delegate cannot enumerate the portfolio', () => {
    const scope = accessService.scopeFor(USER_IDS.mahvish);
    const visible = accessService.filterProperties(scope, propertiesService.list());

    expect(visible.map((property) => property.id).sort()).toEqual(
      [PROPERTY_IDS.bentonSt, PROPERTY_IDS.comptonRd].sort(),
    );
    expect(propertiesService.list().length).toBeGreaterThan(visible.length);
  });

  it('denies a family contributor everything except their assigned tasks', () => {
    const scope = accessService.scopeFor(USER_IDS.hassan);

    expect(() => accessService.requireCapability(scope, 'obligation.read')).not.toThrow();
    expect(() => accessService.requireCapability(scope, 'portfolio.totals.read')).toThrow(ForbiddenError);
    expect(() => accessService.requireCapability(scope, 'property.read')).toThrow(ForbiddenError);
    expect(() => accessService.requireCapability(scope, 'export.create')).toThrow(ForbiddenError);
  });

  it('gives the accountant read and export but never write or access management', () => {
    const scope = accessService.scopeFor(USER_IDS.accountant);

    expect(() => accessService.requireCapability(scope, 'export.create')).not.toThrow();
    expect(() => accessService.requireCapability(scope, 'expense.read')).not.toThrow();
    expect(() => accessService.requireCapability(scope, 'obligation.write')).toThrow(ForbiddenError);
    expect(() => accessService.requireCapability(scope, 'access.write')).toThrow(ForbiddenError);
  });

  it('keeps the technical operator out of business data', () => {
    const scope = accessService.scopeFor(USER_IDS.operator);

    expect(() => accessService.requireCapability(scope, 'audit.read')).not.toThrow();
    expect(() => accessService.requireCapability(scope, 'property.read')).toThrow(ForbiddenError);
    expect(() => accessService.requireCapability(scope, 'portfolio.totals.read')).toThrow(ForbiddenError);
    expect(() => accessService.requireCapability(scope, 'expense.read')).toThrow(ForbiddenError);
  });

  it('denies by default — no capability is granted implicitly', () => {
    const contributor = accessService.scopeFor(USER_IDS.hassan);
    const everyCapability = [
      'portfolio.totals.read',
      'property.read',
      'lease.read',
      'expense.read',
      'document.read',
      'bank-import.read',
      'bank-import.write',
      'loan.read',
      'entity.read',
      'access.read',
      'access.write',
      'audit.read',
      'export.create',
    ] as const;

    // A family contributor holds exactly one capability; everything else denies.
    const granted = everyCapability.filter((capability) => contributor.capabilities.includes(capability));
    expect(granted).toEqual([]);
    expect(contributor.capabilities).toEqual(['obligation.read']);
  });
});
