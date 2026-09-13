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
  harlowRoom1: asId<'PropertyComponent'>('cmp-harlow-r1'),
  harlowRoom2: asId<'PropertyComponent'>('cmp-harlow-r2'),
  harlowRoom3: asId<'PropertyComponent'>('cmp-harlow-r3'),
  harlowRoom4: asId<'PropertyComponent'>('cmp-harlow-r4'),
  harlowRoom5: asId<'PropertyComponent'>('cmp-harlow-r5'),
  harlowRoom6: asId<'PropertyComponent'>('cmp-harlow-r6'),
  marlinWhole: asId<'PropertyComponent'>('cmp-marlin-whole'),
  vernonWhole: asId<'PropertyComponent'>('cmp-vernon-whole'),
};

export function seedProperties(): readonly Property[] {
  return [
    {
      id: PROPERTY_IDS.harlowRd,
      name: '14 Harlow Rd, Ashgrove',
      fullAddress: '14 Harlow Rd, Ashgrove QLD 4060',
      status: 'rented',
      rentalMode: 'by-room',
      ownershipLabel: 'Whitfield Family Trust · 100%',
      holdingNote:
        'Held by Whitfield Family Trust (corporate trustee: Northgate Holdings Pty Ltd) · settled 12 Mar 2021',
      settledOn: '2021-03-12',
      consolidationMethodChosen: true,
    },
    {
      id: PROPERTY_IDS.marlinSt,
      name: '8 Marlin St, Newstead',
      fullAddress: '8 Marlin St, Newstead QLD 4006',
      status: 'rented',
      rentalMode: 'whole',
      ownershipLabel: 'Northgate Holdings · 100%',
      holdingNote: 'Held by Northgate Holdings Pty Ltd · settled 19 Jul 2022',
      settledOn: '2022-07-19',
      consolidationMethodChosen: true,
    },
    {
      id: PROPERTY_IDS.calderRd,
      name: 'Calder Rd, Oakleigh',
      fullAddress: 'Calder Rd, Oakleigh QLD 4152',
      status: 'own-home',
      rentalMode: 'not-rented',
      ownershipLabel: 'Adam & Nadia · 50/50',
      holdingNote: 'Held jointly by Adam Whitfield and Nadia Whitfield · settled 30 Sep 2019',
      settledOn: '2019-09-30',
      // Jointly held 50/50 across two individuals; how it consolidates is undecided.
      consolidationMethodChosen: false,
    },
    {
      id: PROPERTY_IDS.vernonRd,
      name: 'Vernon Rd, Brookfield',
      fullAddress: 'Vernon Rd, Brookfield QLD 4069',
      status: 'vacant',
      rentalMode: 'whole',
      ownershipLabel: 'Whitfield Family Trust · 100%',
      holdingNote: 'Held by Whitfield Family Trust · settled 2 May 2023',
      settledOn: '2023-05-02',
      consolidationMethodChosen: true,
    },
    {
      id: PROPERTY_IDS.fairmontReserve,
      name: 'Lot 12, Fairmont Reserve',
      fullAddress: 'Lot 12, Fairmont Reserve QLD 4133',
      status: 'under-construction',
      rentalMode: 'not-rented',
      ownershipLabel: 'Northgate Holdings · 100%',
      holdingNote: 'Held by Northgate Holdings Pty Ltd · under construction',
      constructionCostToDate: fromMajorUnits(318_000),
      consolidationMethodChosen: true,
    },
  ];
}

/**
 * Earlier valuations.
 *
 * `latestValuation` selects the most recent on or before the as-of date, so
 * adding history changes no current figure — it gives the valuation trail
 * something to show and makes the staleness rule visible over time.
 */
function valuationHistory(): Valuation[] {
  const entries: readonly (readonly [string, keyof typeof PROPERTY_IDS, number, Valuation['basis'], string, Valuation['confidence']])[] = [
    ['val-harlow-2024-07', 'harlowRd', 1_040_000, 'bank', '2024-07-11', 'high'],
    ['val-harlow-2022-09', 'harlowRd', 905_000, 'agent-appraisal', '2022-09-14', 'medium'],
    ['val-harlow-2021-03', 'harlowRd', 812_000, 'purchase-price', '2021-03-12', 'high'],
    ['val-marlin-2023-08', 'marlinSt', 870_000, 'bank', '2023-08-22', 'high'],
    ['val-marlin-2022-07', 'marlinSt', 795_000, 'purchase-price', '2022-07-19', 'high'],
    ['val-calder-2024-02', 'calderRd', 968_000, 'bank', '2024-02-19', 'high'],
    ['val-calder-2019-09', 'calderRd', 640_000, 'purchase-price', '2019-09-30', 'high'],
  ];

  return entries.map(([id, property, amount, basis, valuedOn, confidence]) => ({
    id: asId<'Valuation'>(id),
    propertyId: PROPERTY_IDS[property],
    amount: fromMajorUnits(amount),
    basis,
    valuedOn,
    confidence,
    datePrecision: 'month' as const,
  }));
}

export function seedValuations(): readonly Valuation[] {
  return [
    ...valuationHistory(),
    {
      id: asId<'Valuation'>('val-harlow-2026-08'),
      propertyId: PROPERTY_IDS.harlowRd,
      amount: fromMajorUnits(1_180_000),
      basis: 'bank',
      valuedOn: '2026-08-18',
      confidence: 'high',
      datePrecision: 'month',
    },
    {
      id: asId<'Valuation'>('val-marlin-2025-06'),
      propertyId: PROPERTY_IDS.marlinSt,
      amount: fromMajorUnits(940_000),
      basis: 'agent-appraisal',
      valuedOn: '2025-06-10',
      confidence: 'medium',
      datePrecision: 'month',
    },
    {
      id: asId<'Valuation'>('val-calder-2026-03'),
      propertyId: PROPERTY_IDS.calderRd,
      amount: fromMajorUnits(1_052_000),
      basis: 'bank',
      valuedOn: '2026-03-04',
      confidence: 'high',
      datePrecision: 'month',
    },
    {
      id: asId<'Valuation'>('val-vernon-2023'),
      propertyId: PROPERTY_IDS.vernonRd,
      amount: fromMajorUnits(760_000),
      basis: 'purchase-price',
      valuedOn: '2023-05-02',
      confidence: 'low',
      datePrecision: 'year',
    },
    {
      id: asId<'Valuation'>('val-fairmont-cost'),
      propertyId: PROPERTY_IDS.fairmontReserve,
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
    { id: COMPONENT_IDS.harlowRoom1, propertyId: PROPERTY_IDS.harlowRd, kind: 'room', label: 'Room 1', position: 1 },
    { id: COMPONENT_IDS.harlowRoom2, propertyId: PROPERTY_IDS.harlowRd, kind: 'room', label: 'Room 2', position: 2 },
    { id: COMPONENT_IDS.harlowRoom3, propertyId: PROPERTY_IDS.harlowRd, kind: 'room', label: 'Room 3', position: 3 },
    { id: COMPONENT_IDS.harlowRoom4, propertyId: PROPERTY_IDS.harlowRd, kind: 'room', label: 'Room 4', position: 4 },
    { id: COMPONENT_IDS.harlowRoom5, propertyId: PROPERTY_IDS.harlowRd, kind: 'room', label: 'Room 5', position: 5 },
    {
      id: COMPONENT_IDS.harlowRoom6,
      propertyId: PROPERTY_IDS.harlowRd,
      kind: 'room',
      label: 'Room 6',
      position: 6,
      vacantSince: '2026-08-24',
    },
    { id: COMPONENT_IDS.marlinWhole, propertyId: PROPERTY_IDS.marlinSt, kind: 'whole', label: 'Whole property', position: 1 },
    {
      id: COMPONENT_IDS.vernonWhole,
      propertyId: PROPERTY_IDS.vernonRd,
      kind: 'whole',
      label: 'Whole property',
      position: 1,
      vacantSince: '2026-08-20',
    },
  ];
}
