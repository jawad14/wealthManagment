/**
 * Seeded properties, valuations and components.
 * Mirrors the "Properties & assets" screen of the design prototype.
 */
import { asId } from '@/shared/types/common';
import { fromMajorUnits } from '@/shared/lib/money';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import type { Property, PropertyComponent, Valuation } from '../model';

export { PROPERTY_IDS };

export const COMPONENT_IDS = {
  comptonRoom1: asId<'PropertyComponent'>('cmp-compton-r1'),
  comptonRoom2: asId<'PropertyComponent'>('cmp-compton-r2'),
  comptonRoom3: asId<'PropertyComponent'>('cmp-compton-r3'),
  comptonRoom4: asId<'PropertyComponent'>('cmp-compton-r4'),
  comptonRoom5: asId<'PropertyComponent'>('cmp-compton-r5'),
  comptonRoom6: asId<'PropertyComponent'>('cmp-compton-r6'),
  bentonWhole: asId<'PropertyComponent'>('cmp-benton-whole'),
  miansWhole: asId<'PropertyComponent'>('cmp-mians-whole'),
};

export function seedProperties(): readonly Property[] {
  return [
    {
      id: PROPERTY_IDS.comptonRd,
      name: '166 Compton Rd, Woodridge',
      fullAddress: '166 Compton Rd, Woodridge QLD 4114',
      status: 'rented',
      rentalMode: 'by-room',
      ownershipLabel: 'Siddique Family Trust · 100%',
      holdingNote:
        'Held by Siddique Family Trust (corporate trustee: Esteem Development Pty Ltd) · settled 12 Mar 2021',
      settledOn: '2021-03-12',
      consolidationMethodChosen: true,
    },
    {
      id: PROPERTY_IDS.bentonSt,
      name: '20 Benton St, Acacia Ridge',
      fullAddress: '20 Benton St, Acacia Ridge QLD 4110',
      status: 'rented',
      rentalMode: 'whole',
      ownershipLabel: 'Esteem Development · 100%',
      holdingNote: 'Held by Esteem Development Pty Ltd · settled 19 Jul 2022',
      settledOn: '2022-07-19',
      consolidationMethodChosen: true,
    },
    {
      id: PROPERTY_IDS.watsonRd,
      name: 'Watson Rd, Acacia Ridge',
      fullAddress: 'Watson Rd, Acacia Ridge QLD 4110',
      status: 'own-home',
      rentalMode: 'not-rented',
      ownershipLabel: 'Jawad & Mahvish · 50/50',
      holdingNote: 'Held jointly by Jawad Siddique and Mahvish Gull · settled 30 Sep 2019',
      settledOn: '2019-09-30',
      // Jointly held 50/50 across two individuals; how it consolidates is undecided.
      consolidationMethodChosen: false,
    },
    {
      id: PROPERTY_IDS.miansRd,
      name: 'Mians Rd, Woodridge',
      fullAddress: 'Mians Rd, Woodridge QLD 4114',
      status: 'vacant',
      rentalMode: 'whole',
      ownershipLabel: 'Siddique Family Trust · 100%',
      holdingNote: 'Held by Siddique Family Trust · settled 2 May 2023',
      settledOn: '2023-05-02',
      consolidationMethodChosen: true,
    },
    {
      id: PROPERTY_IDS.loganReserve,
      name: 'Lot 12, Logan Reserve',
      fullAddress: 'Lot 12, Logan Reserve QLD 4133',
      status: 'under-construction',
      rentalMode: 'not-rented',
      ownershipLabel: 'Esteem Development · 100%',
      holdingNote: 'Held by Esteem Development Pty Ltd · under construction',
      constructionCostToDate: fromMajorUnits(318_000),
      consolidationMethodChosen: true,
    },
  ];
}

export function seedValuations(): readonly Valuation[] {
  return [
    {
      id: asId<'Valuation'>('val-compton-2026-08'),
      propertyId: PROPERTY_IDS.comptonRd,
      amount: fromMajorUnits(1_180_000),
      basis: 'bank',
      valuedOn: '2026-08-18',
      confidence: 'high',
      datePrecision: 'month',
    },
    {
      id: asId<'Valuation'>('val-benton-2025-06'),
      propertyId: PROPERTY_IDS.bentonSt,
      amount: fromMajorUnits(940_000),
      basis: 'agent-appraisal',
      valuedOn: '2025-06-10',
      confidence: 'medium',
      datePrecision: 'month',
    },
    {
      id: asId<'Valuation'>('val-watson-2026-03'),
      propertyId: PROPERTY_IDS.watsonRd,
      amount: fromMajorUnits(1_052_000),
      basis: 'bank',
      valuedOn: '2026-03-04',
      confidence: 'high',
      datePrecision: 'month',
    },
    {
      id: asId<'Valuation'>('val-mians-2023'),
      propertyId: PROPERTY_IDS.miansRd,
      amount: fromMajorUnits(760_000),
      basis: 'purchase-price',
      valuedOn: '2023-05-02',
      confidence: 'low',
      datePrecision: 'year',
    },
    {
      id: asId<'Valuation'>('val-logan-cost'),
      propertyId: PROPERTY_IDS.loganReserve,
      amount: fromMajorUnits(318_000),
      basis: 'at-cost',
      valuedOn: '2025-11-04',
      confidence: 'low',
      datePrecision: 'none',
    },
  ];
}

export function seedComponents(): readonly PropertyComponent[] {
  return [
    { id: COMPONENT_IDS.comptonRoom1, propertyId: PROPERTY_IDS.comptonRd, kind: 'room', label: 'Room 1', position: 1 },
    { id: COMPONENT_IDS.comptonRoom2, propertyId: PROPERTY_IDS.comptonRd, kind: 'room', label: 'Room 2', position: 2 },
    { id: COMPONENT_IDS.comptonRoom3, propertyId: PROPERTY_IDS.comptonRd, kind: 'room', label: 'Room 3', position: 3 },
    { id: COMPONENT_IDS.comptonRoom4, propertyId: PROPERTY_IDS.comptonRd, kind: 'room', label: 'Room 4', position: 4 },
    { id: COMPONENT_IDS.comptonRoom5, propertyId: PROPERTY_IDS.comptonRd, kind: 'room', label: 'Room 5', position: 5 },
    {
      id: COMPONENT_IDS.comptonRoom6,
      propertyId: PROPERTY_IDS.comptonRd,
      kind: 'room',
      label: 'Room 6',
      position: 6,
      vacantSince: '2026-08-24',
    },
    { id: COMPONENT_IDS.bentonWhole, propertyId: PROPERTY_IDS.bentonSt, kind: 'whole', label: 'Whole property', position: 1 },
    {
      id: COMPONENT_IDS.miansWhole,
      propertyId: PROPERTY_IDS.miansRd,
      kind: 'whole',
      label: 'Whole property',
      position: 1,
      vacantSince: '2026-08-20',
    },
  ];
}
