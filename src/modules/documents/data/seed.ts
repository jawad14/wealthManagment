/**
 * Seeded documents. Mirrors the "Documents" screen of the design prototype.
 */
import { asId } from '@/shared/types/common';
import { ENTITY_IDS, PROPERTY_IDS } from '@/modules/entities/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import { OBLIGATION_IDS } from '@/modules/obligations/data/seed';
import { LEASE_IDS as ALL_LEASE_IDS } from '@/modules/leases/data/seed';
import { LOAN_IDS } from '@/modules/loans/data/seed';
import type { DocumentRecord, DocumentType } from '../model';

/**
 * The register's routine traffic.
 *
 * A five-year property portfolio accumulates statements, notices, policies and
 * invoices steadily. These are generated deterministically from the real
 * properties, leases and loans so the register looks like a working archive —
 * every row names a plausible counterparty and links to a real record — without
 * hand-writing 137 entries.
 */
function routineDocuments(): DocumentRecord[] {
  const rows: DocumentRecord[] = [];
  const doc = (
    id: string,
    filename: string,
    type: DocumentType,
    uploadedOn: string,
    uploadedBy: (typeof USER_IDS)[keyof typeof USER_IDS],
    sizeBytes: number,
    links: DocumentRecord['links'],
    descriptor?: string,
  ): void => {
    rows.push({
      id: asId<'Document'>(id),
      filename,
      type,
      ...(descriptor ? { descriptor } : {}),
      links,
      uploadedOn,
      uploadedBy,
      versions: [
        { version: 1, uploadedAt: `${uploadedOn}T09:00:00.000Z`, uploadedBy, sizeBytes },
      ],
      aiExtractionApproved: false,
    });
  };

  const properties = [
    { id: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd', slug: 'harlow', council: 'Brisbane City Council' },
    { id: PROPERTY_IDS.marlinSt, label: '8 Marlin St', slug: 'marlin', council: 'Brisbane City Council' },
    { id: PROPERTY_IDS.calderRd, label: 'Calder Rd', slug: 'calder', council: 'Brisbane City Council' },
    { id: PROPERTY_IDS.vernonRd, label: 'Vernon Rd', slug: 'vernon', council: 'Brisbane City Council' },
  ];

  const quarters = [
    { q: 'Q1', month: '09', year: '2026' },
    { q: 'Q2', month: '12', year: '2025' },
    { q: 'Q3', month: '03', year: '2026' },
    { q: 'Q4', month: '06', year: '2026' },
  ];

  // Council rates notices — one per property per quarter.
  properties.forEach((property) => {
    quarters.forEach((quarter) => {
      doc(
        `doc-rates-${property.slug}-${quarter.year}-${quarter.q}`,
        `Rates notice ${property.label} ${quarter.q} ${quarter.year}.pdf`,
        'bill',
        `${quarter.year}-${quarter.month}-08`,
        USER_IDS.nadia,
        180_000,
        [{ type: 'property', propertyId: property.id, label: property.label }],
      );
    });
  });

  // Landlord insurance policies — one per property per year.
  ['2023', '2024', '2025', '2026'].forEach((year) => {
    properties.forEach((property) => {
      doc(
        `doc-insurance-${property.slug}-${year}`,
        `Landlord policy ${property.label} ${year}-${Number(year.slice(2)) + 1}.pdf`,
        'insurance-policy',
        `${year}-08-19`,
        USER_IDS.adam,
        1_100_000,
        [{ type: 'property', propertyId: property.id, label: property.label }],
      );
    });
  });

  // Monthly bank statements for the two operating accounts.
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  [
    { account: 'CBA Everyday', slug: 'cba', entity: ENTITY_IDS.northgate, entityLabel: 'Northgate Holdings' },
    { account: 'Macquarie Offset', slug: 'macq', entity: ENTITY_IDS.adam, entityLabel: 'Adam Whitfield' },
  ].forEach((account) => {
    months.forEach((month) => {
      doc(
        `doc-stmt-${account.slug}-2026-${month}`,
        `${account.account} statement 2026-${month}.pdf`,
        'other',
        `2026-${month}-05`,
        USER_IDS.adam,
        240_000,
        [{ type: 'entity', entityId: account.entity, label: account.entityLabel }],
        'bank statement',
      );
    });
  });

  // Loan statements — quarterly per facility.
  const loanQuarters = [
    '2025-06-30', '2025-09-30', '2025-12-31', '2026-03-31', '2026-06-30', '2026-08-31',
  ];
  [
    { id: LOAN_IDS.macquarie4417, label: 'Macquarie 4417' },
    { id: LOAN_IDS.cba8820, label: 'CBA 8820' },
    { id: LOAN_IDS.anz3305, label: 'ANZ 3305' },
    { id: LOAN_IDS.devlinReceivable, label: 'M. Devlin loan agreement' },
  ].forEach((loan) => {
    loanQuarters.forEach((date) => {
      doc(
        `doc-loan-${loan.id}-${date}`,
        `${loan.label} statement ${date}.pdf`,
        'loan',
        date,
        USER_IDS.adam,
        320_000,
        [{ type: 'loan', loanId: loan.id, label: loan.label }],
      );
    });
  });

  // Signed leases and their renewals.
  const leaseDocs = [
    { id: ALL_LEASE_IDS.okaforR1, tenant: 'L. Okafor', ref: '166C-R1', on: '2026-01-28' },
    { id: ALL_LEASE_IDS.chenR2, tenant: 'M. Chen', ref: '166C-R2', on: '2026-04-10' },
    { id: ALL_LEASE_IDS.nguyenR3, tenant: 'A. Nguyen', ref: '166C-R3', on: '2026-05-27' },
    { id: ALL_LEASE_IDS.williamsR4, tenant: 'S. Williams', ref: '166C-R4', on: '2026-06-25' },
    { id: ALL_LEASE_IDS.rahmanR5, tenant: 'D. Rahman', ref: '166C-R5', on: '2026-08-05' },
  ];
  leaseDocs.forEach((lease) => {
    doc(
      `doc-lease-${lease.ref}`,
      `Lease ${lease.tenant} ${lease.ref}.pdf`,
      'lease',
      lease.on,
      USER_IDS.adam,
      2_100_000,
      [{ type: 'lease', leaseId: lease.id, label: `Lease ${lease.ref}` }],
    );
    doc(
      `doc-bond-${lease.ref}`,
      `Bond lodgement ${lease.ref}.pdf`,
      'other',
      lease.on,
      USER_IDS.nadia,
      140_000,
      [{ type: 'lease', leaseId: lease.id, label: `Lease ${lease.ref}` }],
      'RTA bond receipt',
    );
    doc(
      `doc-condition-${lease.ref}`,
      `Entry condition report ${lease.ref}.pdf`,
      'other',
      lease.on,
      USER_IDS.nadia,
      3_400_000,
      [{ type: 'lease', leaseId: lease.id, label: `Lease ${lease.ref}` }],
      'entry condition report',
    );
  });

  // Utility bills across the let properties.
  const utilityMonths = ['01', '02', '04', '05', '06', '08'];
  [
    { id: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd', supplier: 'Urban Utilities' },
    { id: PROPERTY_IDS.marlinSt, label: '8 Marlin St', supplier: 'Urban Utilities' },
    { id: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd', supplier: 'Energex Retail' },
  ].forEach((entry, index) => {
    utilityMonths.forEach((month) => {
      doc(
        `doc-utility-${index}-2026-${month}`,
        `${entry.supplier} ${entry.label} 2026-${month}.pdf`,
        'bill',
        `2026-${month}-22`,
        USER_IDS.nadia,
        290_000,
        [{ type: 'property', propertyId: entry.id, label: entry.label }],
      );
    });
  });

  // Maintenance invoices and receipts.
  const maintenance = [
    { slug: 'pest-harlow', name: 'Allpest QLD invoice 8841', on: '2026-08-18', property: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd' },
    { slug: 'pest-marlin', name: 'Allpest QLD receipt 8902', on: '2026-08-13', property: PROPERTY_IDS.marlinSt, label: '8 Marlin St' },
    { slug: 'plumb-harlow', name: 'Ryan Plumbing invoice 1123', on: '2026-07-04', property: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd' },
    { slug: 'elec-marlin', name: 'Sparks Electrical invoice 552', on: '2026-06-19', property: PROPERTY_IDS.marlinSt, label: '8 Marlin St' },
    { slug: 'garden-vernon', name: 'Greenline Gardening invoice 77', on: '2026-05-30', property: PROPERTY_IDS.vernonRd, label: 'Vernon Rd' },
    { slug: 'locks-harlow', name: 'Southside Locksmiths invoice 210', on: '2026-05-12', property: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd' },
    { slug: 'paint-vernon', name: 'Coastline Painting quote 4410', on: '2026-04-21', property: PROPERTY_IDS.vernonRd, label: 'Vernon Rd' },
    { slug: 'roof-calder', name: 'Apex Roofing invoice 3318', on: '2026-03-15', property: PROPERTY_IDS.calderRd, label: 'Calder Rd' },
    { slug: 'fence-marlin', name: 'Metro Fencing invoice 1902', on: '2026-01-19', property: PROPERTY_IDS.marlinSt, label: '8 Marlin St' },
  ];
  maintenance.forEach((entry) => {
    doc(
      `doc-maint-${entry.slug}`,
      `${entry.name}.pdf`,
      entry.name.includes('receipt') ? 'receipt' : 'invoice',
      entry.on,
      USER_IDS.nadia,
      210_000,
      [{ type: 'property', propertyId: entry.property, label: entry.label }],
    );
  });

  // Compliance certificates.
  [
    { slug: 'smoke-harlow', name: 'Smoke alarm certificate 14 Harlow Rd 2026', on: '2026-02-14', property: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd' },
    { slug: 'smoke-marlin', name: 'Smoke alarm certificate 8 Marlin St 2026', on: '2026-07-22', property: PROPERTY_IDS.marlinSt, label: '8 Marlin St' },
    { slug: 'pool-calder', name: 'Pool safety certificate Calder Rd 2024', on: '2024-10-02', property: PROPERTY_IDS.calderRd, label: 'Calder Rd' },
    { slug: 'elec-safety-harlow', name: 'Electrical safety switch test 14 Harlow Rd', on: '2026-03-08', property: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd' },
  ].forEach((entry) => {
    doc(
      `doc-compliance-${entry.slug}`,
      `${entry.name}.pdf`,
      'other',
      entry.on,
      USER_IDS.nadia,
      160_000,
      [{ type: 'property', propertyId: entry.property, label: entry.label }],
      'compliance certificate',
    );
  });

  // Historical valuations.
  [
    { slug: 'harlow-2024', name: 'Bank valuation 14 Harlow Rd 2024', on: '2024-07-11', property: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd' },
    { slug: 'calder-2026', name: 'Bank valuation Calder Rd Mar 2026', on: '2026-03-06', property: PROPERTY_IDS.calderRd, label: 'Calder Rd' },
    { slug: 'marlin-2025', name: 'Agent appraisal 8 Marlin St Jun 2025', on: '2025-06-12', property: PROPERTY_IDS.marlinSt, label: '8 Marlin St' },
    { slug: 'vernon-2023', name: 'Contract of sale Vernon Rd 2023', on: '2023-05-02', property: PROPERTY_IDS.vernonRd, label: 'Vernon Rd' },
  ].forEach((entry) => {
    doc(
      `doc-val-${entry.slug}`,
      `${entry.name}.pdf`,
      'valuation',
      entry.on,
      USER_IDS.adam,
      760_000,
      [{ type: 'property', propertyId: entry.property, label: entry.label }],
    );
  });

  // Entity and structuring records.
  [
    { slug: 'trust-deed', name: 'Whitfield Family Trust deed 2019', on: '2019-06-04', entity: ENTITY_IDS.familyTrust, label: 'Whitfield Family Trust' },
    { slug: 'trust-variation', name: 'Trust deed variation 2022', on: '2022-03-17', entity: ENTITY_IDS.familyTrust, label: 'Whitfield Family Trust' },
    { slug: 'northgate-asic', name: 'Northgate Holdings ASIC annual statement 2026', on: '2026-02-01', entity: ENTITY_IDS.northgate, label: 'Northgate Holdings' },
    { slug: 'northgate-constitution', name: 'Northgate Holdings constitution', on: '2018-02-01', entity: ENTITY_IDS.northgate, label: 'Northgate Holdings' },
    { slug: 'smsf-deed', name: 'Whitfield Superannuation Fund trust deed', on: '2020-04-01', entity: ENTITY_IDS.smsf, label: 'Whitfield Superannuation Fund' },
    { slug: 'water-agreement', name: 'Water usage split agreement 60-40', on: '2026-09-05', entity: ENTITY_IDS.familyTrust, label: 'Whitfield Family Trust' },
  ].forEach((entry) => {
    doc(
      `doc-${entry.slug}`,
      `${entry.name}.pdf`,
      'other',
      entry.on,
      USER_IDS.adam,
      520_000,
      [{ type: 'entity', entityId: entry.entity, label: entry.label }],
      'entity record',
    );
  });

  // One further genuinely unlinked upload, alongside the receipt photo below.
  doc(
    'doc-scan-unfiled',
    'Scan_20260903_0007.pdf',
    'other',
    '2026-09-03',
    USER_IDS.nadia,
    880_000,
    [],
    'scanned, not yet filed',
  );

  return rows;
}

export function seedDocuments(): readonly DocumentRecord[] {
  return [
    ...routineDocuments(),
    {
      id: asId<'Document'>('doc-terri-scheer'),
      filename: 'Terri Scheer landlord policy 2026-27.pdf',
      type: 'insurance-policy',
      links: [
        { type: 'property', propertyId: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd' },
        { type: 'obligation', obligationId: OBLIGATION_IDS.insuranceHarlow, label: 'Landlord insurance renewal' },
      ],
      uploadedOn: '2026-08-20',
      uploadedBy: USER_IDS.adam,
      versions: [{ version: 1, uploadedAt: '2026-08-20T10:12:00.000Z', uploadedBy: USER_IDS.adam, sizeBytes: 1_200_000 }],
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
      uploadedBy: USER_IDS.nadia,
      versions: [{ version: 1, uploadedAt: '2026-08-25T16:04:00.000Z', uploadedBy: USER_IDS.nadia, sizeBytes: 310_000 }],
      aiExtractionApproved: false,
    },
    {
      id: asId<'Document'>('doc-lease-patel'),
      filename: 'Lease R. Patel 8 Marlin St.pdf',
      type: 'lease',
      links: [
        { type: 'property', propertyId: PROPERTY_IDS.marlinSt, label: '8 Marlin St' },
        { type: 'lease', leaseId: ALL_LEASE_IDS.patelMarlin, label: 'Lease 20B-WH' },
      ],
      uploadedOn: '2025-10-28',
      uploadedBy: USER_IDS.adam,
      versions: [
        { version: 1, uploadedAt: '2025-10-28T09:30:00.000Z', uploadedBy: USER_IDS.adam, sizeBytes: 2_100_000 },
        {
          version: 2,
          uploadedAt: '2026-05-01T11:15:00.000Z',
          uploadedBy: USER_IDS.adam,
          sizeBytes: 2_400_000,
          note: 'Rent increase amendment 1 May',
        },
      ],
      aiExtractionApproved: false,
    },
    {
      id: asId<'Document'>('doc-cba-valuation'),
      filename: 'CBA bank valuation Harlow Rd Aug 2026.pdf',
      type: 'valuation',
      links: [
        { type: 'property', propertyId: PROPERTY_IDS.harlowRd, label: '14 Harlow Rd' },
        { type: 'valuation', valuationId: 'val-harlow-2026-08', label: 'Valuation 18 Aug 26' },
      ],
      uploadedOn: '2026-08-19',
      uploadedBy: USER_IDS.adam,
      versions: [{ version: 1, uploadedAt: '2026-08-19T13:47:00.000Z', uploadedBy: USER_IDS.adam, sizeBytes: 880_000 }],
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
      uploadedBy: USER_IDS.nadia,
      versions: [{ version: 1, uploadedAt: '2026-09-02T08:20:00.000Z', uploadedBy: USER_IDS.nadia, sizeBytes: 3_100_000 }],
      aiExtractionApproved: false,
    },
  ];
}
