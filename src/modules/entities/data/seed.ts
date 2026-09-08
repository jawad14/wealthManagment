/**
 * Seeded entities and the ownership graph.
 * Mirrors the "Entities & ownership" screen of the design prototype.
 */
import { asId, type EntityId, type PropertyId } from '@/shared/types/common';
import type { Entity, Relationship } from '../model';

export const ENTITY_IDS = {
  jawad: asId<'Entity'>('ent-jawad'),
  mahvish: asId<'Entity'>('ent-mahvish'),
  esteem: asId<'Entity'>('ent-esteem'),
  familyTrust: asId<'Entity'>('ent-family-trust'),
  smsf: asId<'Entity'>('ent-smsf'),
  hassan: asId<'Entity'>('ent-hassan'),
} satisfies Record<string, EntityId>;

/** Property ids are declared here too so the ownership graph can reference them. */
export const PROPERTY_IDS = {
  comptonRd: asId<'Property'>('prop-compton-rd'),
  bentonSt: asId<'Property'>('prop-benton-st'),
  watsonRd: asId<'Property'>('prop-watson-rd'),
  miansRd: asId<'Property'>('prop-mians-rd'),
  loganReserve: asId<'Property'>('prop-logan-reserve'),
} satisfies Record<string, PropertyId>;

export function seedEntities(): readonly Entity[] {
  return [
    {
      id: ENTITY_IDS.jawad,
      name: 'Jawad Siddique',
      kind: 'individual',
      descriptor: 'Individual',
      monogram: 'JS',
      consolidation: 'look-through',
      valueNote: 'Included interests',
    },
    {
      id: ENTITY_IDS.mahvish,
      name: 'Mahvish Gull',
      kind: 'individual',
      descriptor: 'Individual',
      monogram: 'MG',
      consolidation: 'look-through',
      valueNote: 'Included interests',
    },
    {
      id: ENTITY_IDS.esteem,
      name: 'Esteem Development Pty Ltd',
      kind: 'company',
      descriptor: 'Company · ACN 6xx xxx xxx',
      monogram: 'Pty',
      consolidation: 'look-through',
      consolidationNote: 'Consolidated look-through',
      valueNote: 'Net of debt',
    },
    {
      id: ENTITY_IDS.familyTrust,
      name: 'Siddique Family Trust',
      kind: 'trust',
      descriptor: 'Discretionary trust · est. 2019',
      monogram: 'Tr',
      consolidation: 'look-through',
      consolidationNote: 'Consolidated look-through',
      valueNote: 'Net of debt',
      establishedYear: 2019,
    },
    {
      id: ENTITY_IDS.hassan,
      name: 'Hassan Siddique',
      kind: 'individual',
      descriptor: 'Individual',
      monogram: 'HS',
      consolidation: 'look-through',
      // Holds no asset interests yet — a family contributor with assigned tasks
      // and a budget, which is why the register lists him with no figure.
      valueNote: 'No recorded interests',
    },
    {
      id: ENTITY_IDS.smsf,
      name: 'Siddique Superannuation Fund',
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
      id: 'rel-trust-compton',
      subjectEntityId: ENTITY_IDS.familyTrust,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.comptonRd },
      sharePercent: 100,
      from: '2021-03-12',
      to: null,
      label: 'Owns · 166 Compton Rd',
    },
    {
      id: 'rel-trust-mians',
      subjectEntityId: ENTITY_IDS.familyTrust,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.miansRd },
      sharePercent: 100,
      from: '2023-05-02',
      to: null,
      label: 'Owns · Mians Rd',
    },
    {
      id: 'rel-esteem-benton',
      subjectEntityId: ENTITY_IDS.esteem,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.bentonSt },
      sharePercent: 100,
      from: '2022-07-19',
      to: null,
      label: 'Owns · 20 Benton St',
    },
    {
      id: 'rel-esteem-logan',
      subjectEntityId: ENTITY_IDS.esteem,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.loganReserve },
      sharePercent: 100,
      from: '2025-11-04',
      to: null,
      label: 'Owns · Lot 12',
    },
    {
      id: 'rel-jawad-watson',
      subjectEntityId: ENTITY_IDS.jawad,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.watsonRd },
      sharePercent: 50,
      from: '2019-09-30',
      to: null,
      label: 'Joint owner · Watson Rd (50%)',
    },
    {
      id: 'rel-mahvish-watson',
      subjectEntityId: ENTITY_IDS.mahvish,
      kind: 'owns',
      target: { type: 'property', propertyId: PROPERTY_IDS.watsonRd },
      sharePercent: 50,
      from: '2019-09-30',
      to: null,
      label: 'Joint owner · Watson Rd (50%)',
    },

    // --- Control (never carries a share) ---
    {
      id: 'rel-jawad-director-esteem',
      subjectEntityId: ENTITY_IDS.jawad,
      kind: 'director-of',
      target: { type: 'entity', entityId: ENTITY_IDS.esteem },
      from: '2018-02-01',
      to: null,
      label: 'Director · Esteem Development',
    },
    {
      id: 'rel-jawad-beneficiary-trust',
      subjectEntityId: ENTITY_IDS.jawad,
      kind: 'beneficiary-of',
      target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
      from: '2019-06-01',
      to: null,
      label: 'Beneficiary · Family Trust',
    },
    {
      id: 'rel-jawad-member-smsf',
      subjectEntityId: ENTITY_IDS.jawad,
      kind: 'member-of',
      target: { type: 'entity', entityId: ENTITY_IDS.smsf },
      from: '2020-04-01',
      to: null,
      label: 'Member · Siddique SMSF',
    },
    {
      id: 'rel-mahvish-beneficiary-trust',
      subjectEntityId: ENTITY_IDS.mahvish,
      kind: 'beneficiary-of',
      target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
      from: '2019-06-01',
      to: null,
      label: 'Beneficiary · Family Trust',
    },
    {
      id: 'rel-hassan-beneficiary-trust',
      subjectEntityId: ENTITY_IDS.hassan,
      kind: 'beneficiary-of',
      target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
      from: '2019-06-01',
      to: null,
      label: 'Beneficiary · Family Trust',
    },
    {
      id: 'rel-mahvish-member-smsf',
      subjectEntityId: ENTITY_IDS.mahvish,
      kind: 'member-of',
      target: { type: 'entity', entityId: ENTITY_IDS.smsf },
      from: '2020-04-01',
      to: null,
      label: 'Member · Siddique SMSF',
    },
    {
      id: 'rel-esteem-trustee-trust',
      subjectEntityId: ENTITY_IDS.esteem,
      kind: 'trustee-of',
      target: { type: 'entity', entityId: ENTITY_IDS.familyTrust },
      from: '2019-06-01',
      to: null,
      label: 'Trustee for · Siddique Family Trust',
    },
    {
      id: 'rel-esteem-borrower-cba',
      subjectEntityId: ENTITY_IDS.esteem,
      kind: 'borrower-of',
      target: { type: 'external', label: 'CBA 8820' },
      from: '2022-07-19',
      to: null,
      label: 'Borrower · CBA 8820',
    },
  ];
}
