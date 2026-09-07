/**
 * Properties data access.
 */
import { createCollection } from '@/server/db/collection';
import type { PropertyId } from '@/shared/types/common';
import type { Property, PropertyComponent, Valuation } from './model';
import { seedComponents, seedProperties, seedValuations } from './data/seed';

const properties = createCollection<Property>('properties.properties', seedProperties);
const valuations = createCollection<Valuation>('properties.valuations', seedValuations);
const components = createCollection<PropertyComponent>('properties.components', seedComponents);

export const propertiesRepository = {
  list: (): readonly Property[] => properties.list(),
  find: (id: PropertyId): Property | undefined => properties.find(id),

  listValuations: (propertyId: PropertyId): readonly Valuation[] =>
    valuations.where((valuation) => valuation.propertyId === propertyId),

  /** Most recent valuation on or before `asOf`, or undefined when none exists. */
  latestValuation: (propertyId: PropertyId, asOf: string): Valuation | undefined =>
    [...valuations.where((valuation) => valuation.propertyId === propertyId && valuation.valuedOn <= asOf)].sort(
      (a, b) => b.valuedOn.localeCompare(a.valuedOn),
    )[0],

  addValuation: (valuation: Valuation): Valuation => valuations.insert(valuation),

  listComponents: (propertyId: PropertyId): readonly PropertyComponent[] =>
    [...components.where((component) => component.propertyId === propertyId)].sort(
      (a, b) => a.position - b.position,
    ),

  listAllComponents: (): readonly PropertyComponent[] => components.list(),
};
