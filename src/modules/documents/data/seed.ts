/**
 * Seeded documents. Mirrors the "Documents" screen of the design prototype.
 */
import { asId } from '@/shared/types/common';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import { OBLIGATION_IDS } from '@/modules/obligations/data/seed';
import { LEASE_IDS } from '@/modules/leases/data/seed';
import type { DocumentRecord } from '../model';

export function seedDocuments(): readonly DocumentRecord[] {
  return [
    {
      id: asId<'Document'>('doc-terri-scheer'),
      filename: 'Terri Scheer landlord policy 2026-27.pdf',
      type: 'insurance-policy',
      links: [
        { type: 'property', propertyId: PROPERTY_IDS.comptonRd, label: '166 Compton Rd' },
        { type: 'obligation', obligationId: OBLIGATION_IDS.insuranceCompton, label: 'Landlord insurance renewal' },
      ],
      uploadedOn: '2026-08-20',
      uploadedBy: USER_IDS.jawad,
      versions: [{ version: 1, uploadedAt: '2026-08-20T10:12:00.000Z', uploadedBy: USER_IDS.jawad, sizeBytes: 1_200_000 }],
      aiExtractionApproved: false,
    },
    {
      id: asId<'Document'>('doc-urban-utilities'),
      filename: 'Urban Utilities bill 4471 Jul-Aug.pdf',
      type: 'bill',
      links: [
        { type: 'obligation', obligationId: OBLIGATION_IDS.waterUsage, label: 'Water usage · shared bill (60/40 agreement)' },
      ],
      uploadedOn: '2026-08-25',
      uploadedBy: USER_IDS.mahvish,
      versions: [{ version: 1, uploadedAt: '2026-08-25T16:04:00.000Z', uploadedBy: USER_IDS.mahvish, sizeBytes: 310_000 }],
      aiExtractionApproved: false,
    },
    {
      id: asId<'Document'>('doc-lease-patel'),
      filename: 'Lease R. Patel 20 Benton St.pdf',
      type: 'lease',
      links: [
        { type: 'property', propertyId: PROPERTY_IDS.bentonSt, label: '20 Benton St' },
        { type: 'lease', leaseId: LEASE_IDS.patelBenton, label: 'Lease 20B-WH' },
      ],
      uploadedOn: '2025-10-28',
      uploadedBy: USER_IDS.jawad,
      versions: [
        { version: 1, uploadedAt: '2025-10-28T09:30:00.000Z', uploadedBy: USER_IDS.jawad, sizeBytes: 2_100_000 },
        {
          version: 2,
          uploadedAt: '2026-05-01T11:15:00.000Z',
          uploadedBy: USER_IDS.jawad,
          sizeBytes: 2_400_000,
          note: 'Rent increase amendment 1 May',
        },
      ],
      aiExtractionApproved: false,
    },
    {
      id: asId<'Document'>('doc-cba-valuation'),
      filename: 'CBA bank valuation Compton Rd Aug 2026.pdf',
      type: 'valuation',
      links: [
        { type: 'property', propertyId: PROPERTY_IDS.comptonRd, label: '166 Compton Rd' },
        { type: 'valuation', valuationId: 'val-compton-2026-08', label: 'Valuation 18 Aug 26' },
      ],
      uploadedOn: '2026-08-19',
      uploadedBy: USER_IDS.jawad,
      versions: [{ version: 1, uploadedAt: '2026-08-19T13:47:00.000Z', uploadedBy: USER_IDS.jawad, sizeBytes: 880_000 }],
      aiExtractionApproved: false,
    },
    {
      // Deliberately unlinked — the platform surfaces these rather than filing
      // them somewhere plausible on the user's behalf.
      id: asId<'Document'>('doc-img-4471'),
      filename: 'IMG_4471.jpg',
      type: 'receipt',
      descriptor: 'photo of receipt',
      links: [],
      uploadedOn: '2026-09-02',
      uploadedBy: USER_IDS.mahvish,
      versions: [{ version: 1, uploadedAt: '2026-09-02T08:20:00.000Z', uploadedBy: USER_IDS.mahvish, sizeBytes: 3_100_000 }],
      aiExtractionApproved: false,
    },
  ];
}
