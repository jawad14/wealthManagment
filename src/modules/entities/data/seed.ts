/**
 * Seeded entities and the ownership graph.
 * Mirrors the "Entities & ownership" screen of the design prototype.
 */
import { asId, type EntityId, type PropertyId } from '@/shared/types/common';
import type { Entity, Relationship } from '../model';

export const ENTITY_IDS = {
  adam: asId<'Entity'>('ent-adam'),
  nadia: asId<'Entity'>('ent-nadia'),
  northgate: asId<'Entity'>('ent-northgate'),
  familyTrust: asId<'Entity'>('ent-family-trust'),
  smsf: asId<'Entity'>('ent-smsf'),
  leo: asId<'Entity'>('ent-leo'),
} satisfies Record<string, EntityId>;

/** Property ids are declared here too so the ownership graph can reference them. */
export const PROPERTY_IDS = {
  harlowRd: asId<'Property'>('prop-harlow-rd'),
  marlinSt: asId<'Property'>('prop-marlin-st'),
  calderRd: asId<'Property'>('prop-calder-rd'),
  vernonRd: asId<'Property'>('prop-vernon-rd'),
  fairmontReserve: asId<'Property'>('prop-fairmont-reserve'),
} satisfies Record<string, PropertyId>;

export function seedEntities(): readonly Entity[] {
  return [
    {
      id: ENTITY_IDS.adam,
      name: 'Adam Whitfield',
      kind: 'individual',
      descriptor: 'Individual',
      monogram: 'AW',
      consolidation: 'look-through',
      valueNote: 'Included interests',
    },
    {
      id: ENTITY_IDS.nadia,
      name: 'Nadia Whitfield',
      kind: 'individual',
      descriptor: 'Individual',
      monogram: 'NW',
      consolidation: 'look-through',
      valueNote: 'Included interests',
    },
    {
      id: ENTITY_IDS.northgate,
      name: 'Northgate Holdings Pty Ltd',
      kind: 'company',
      descriptor: 'Company · ACN 6xx xxx xxx',
      monogram: 'Pty',
      consolidation: 'look-through',
      consolidationNote: 'Consolidated look-through',
      valueNote: 'Net of debt',
    },
    {
      id: ENTITY_IDS.familyTrust,
      name: 'Whitfield Family Trust',
      kind: 'trust',
      descriptor: 'Discretionary trust · est. 2019',
      monogram: 'Tr',
      consolidation: 'look-through',
      consolidationNote: 'Consolidated look-through',
      valueNote: 'Net of debt',
      establishedYear: 2019,
    },
    {
      id: ENTITY_IDS.leo,
      name: 'Leo Whitfield',
      kind: 'individual',
      descriptor: 'Individual',
      monogram: 'LW',
      consolidation: 'look-through',
      // Holds no asset interests yet — a family contributor with assigned tasks
      // and a budget, which is why the register lists him with no figure.
      valueNote: 'No recorded interests',
    },
    {
      id: ENTITY_IDS.smsf,
      name: 'Whitfield Superannuation Fund',
      kind: 'smsf',
      descriptor: 'SMSF',
      monogram: 'SF',
      consolidation: 'manual-summary',
      consolidationNote: 'Manual summary · read-only · Release 2',
      valueNote: 'Not included yet',
    },
  ];
}

/**
 * The ownership graph.
 *
 * Note which relations carry `sharePercent` and which do not: director, trustee,
 * beneficiary, member and borrower relations are control only. Beneficiary
 * status in particular never implies a percentage of trust assets.
 */
export function seedRelationships(): readonly Relationship[] {
  return [
    // --- Ownership (carries a share) ---
    {
      id: 'rel-trust-harlow',
      subjectEntityId: ENTITY_IDS.familyTrust,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.harlowRd },
      sharePercent: 100,
      from: '2021-03-12',
      to: null,
      label: 'Owns · 14 Harlow Rd',
    },
    {
      id: 'rel-trust-vernon',
      subjectEntityId: ENTITY_IDS.familyTrust,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.vernonRd },
      sharePercent: 100,
      from: '2023-05-02',
      to: null,
      label: 'Owns · Vernon Rd',
    },
    {
      id: 'rel-northgate-marlin',
      subjectEntityId: ENTITY_IDS.northgate,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.marlinSt },
      sharePercent: 100,
      from: '2022-07-19',
      to: null,
      label: 'Owns · 8 Marlin St',
    },
    {
      id: 'rel-northgate-fairmont',
      subjectEntityId: ENTITY_IDS.northgate,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.fairmontReserve },
      sharePercent: 100,
      from: '2025-11-04',
      to: null,
      label: 'Owns · Lot 12',
    },
    {
      id: 'rel-adam-calder',
      subjectEntityId: ENTITY_IDS.adam,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.calderRd },
      sharePercent: 50,
      from: '2019-09-30',
      to: null,
      label: 'Joint owner · Calder Rd (50%)',
    },
    {
      id: 'rel-nadia-calder',
      subjectEntityId: ENTITY_IDS.nadia,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.calderRd },
      sharePercent: 50,
      from: '2019-09-30',
      to: null,
      label: 'Joint owner · Calder Rd (50%)',
    },

    // --- Control (never carries a share) ---
    {
      id: 'rel-adam-director-northgate',
      subjectEntityId: ENTITY_IDS.adam,
      kind: 'director-of',
      target: { type: 'entity', entityId: ENTITY_IDS.northgate },
      from: '2018-02-01',
      to: null,
      label: 'Director · Northgate Holdings',
    },
    {
      id: 'rel-adam-beneficiary-trust',
      subjectEntityId: ENTITY_IDS.adam,
      kind: 'beneficiary-of',
      target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
      from: '2019-06-01',
      to: null,
      label: 'Beneficiary · Family Trust',
    },
    {
      id: 'rel-adam-member-smsf',
      subjectEntityId: ENTITY_IDS.adam,
      kind: 'member-of',
      target: { type: 'entity', entityId: ENTITY_IDS.smsf },
      from: '2020-04-01',
      to: null,
      label: 'Member · Whitfield SMSF',
    },
    {
      id: 'rel-nadia-beneficiary-trust',
      subjectEntityId: ENTITY_IDS.nadia,
      kind: 'beneficiary-of',
      target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
      from: '2019-06-01',
      to: null,
      label: 'Beneficiary · Family Trust',
    },
    {
      id: 'rel-leo-beneficiary-trust',
      subjectEntityId: ENTITY_IDS.leo,
      kind: 'beneficiary-of',
      target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
      from: '2019-06-01',
      to: null,
      label: 'Beneficiary · Family Trust',
    },
    {
      id: 'rel-nadia-member-smsf',
      subjectEntityId: ENTITY_IDS.nadia,
      kind: 'member-of',
      target: { type: 'entity', entityId: ENTITY_IDS.smsf },
      from: '2020-04-01',
      to: null,
      label: 'Member · Whitfield SMSF',
    },
    {
      id: 'rel-northgate-trustee-trust',
      subjectEntityId: ENTITY_IDS.northgate,
      kind: 'trustee-of',
      target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
      from: '2019-06-01',
      to: null,
      label: 'Trustee for · Whitfield Family Trust',
    },
    {
      id: 'rel-northgate-borrower-cba',
      subjectEntityId: ENTITY_IDS.northgate,
      kind: 'borrower-of',
      target: { type: 'external', label: 'CBA 8820' },
      from: '2022-07-19',
      to: null,
      label: 'Borrower · CBA 8820',
    },
  ];
}
