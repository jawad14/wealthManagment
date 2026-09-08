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
    { id: PROPERTY_IDS.comptonRd, label: '166 Compton Rd', slug: 'compton', council: 'Logan City Council' },
    { id: PROPERTY_IDS.bentonSt, label: '20 Benton St', slug: 'benton', council: 'Brisbane City Council' },
    { id: PROPERTY_IDS.watsonRd, label: 'Watson Rd', slug: 'watson', council: 'Brisbane City Council' },
    { id: PROPERTY_IDS.miansRd, label: 'Mians Rd', slug: 'mians', council: 'Logan City Council' },
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
        USER_IDS.mahvish,
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
        USER_IDS.jawad,
        1_100_000,
        [{ type: 'property', propertyId: property.id, label: property.label }],
      );
    });
  });

  // Monthly bank statements for the two operating accounts.
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  [
    { account: 'CBA Everyday', slug: 'cba', entity: ENTITY_IDS.esteem, entityLabel: 'Esteem Development' },
    { account: 'Macquarie Offset', slug: 'macq', entity: ENTITY_IDS.jawad, entityLabel: 'Jawad Siddique' },
  ].forEach((account) => {
    months.forEach((month) => {
      doc(
        `doc-stmt-${account.slug}-2026-${month}`,
        `${account.account} statement 2026-${month}.pdf`,
        'other',
        `2026-${month}-05`,
        USER_IDS.jawad,
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
    { id: LOAN_IDS.khalidReceivable, label: 'S. Khalid loan agreement' },
  ].forEach((loan) => {
    loanQuarters.forEach((date) => {
      doc(
        `doc-loan-${loan.id}-${date}`,
        `${loan.label} statement ${date}.pdf`,
        'loan',
        date,
        USER_IDS.jawad,
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
      USER_IDS.jawad,
      2_100_000,
      [{ type: 'lease', leaseId: lease.id, label: `Lease ${lease.ref}` }],
    );
    doc(
      `doc-bond-${lease.ref}`,
      `Bond lodgement ${lease.ref}.pdf`,
      'other',
      lease.on,
      USER_IDS.mahvish,
      140_000,
      [{ type: 'lease', leaseId: lease.id, label: `Lease ${lease.ref}` }],
      'RTA bond receipt',
    );
    doc(
      `doc-condition-${lease.ref}`,
      `Entry condition report ${lease.ref}.pdf`,
      'other',
      lease.on,
      USER_IDS.mahvish,
      3_400_000,
      [{ type: 'lease', leaseId: lease.id, label: `Lease ${lease.ref}` }],
      'entry condition report',
    );
  });

  // Utility bills across the let properties.
  const utilityMonths = ['01', '02', '04', '05', '06', '08'];
  [
    { id: PROPERTY_IDS.comptonRd, label: '166 Compton Rd', supplier: 'Urban Utilities' },
    { id: PROPERTY_IDS.bentonSt, label: '20 Benton St', supplier: 'Urban Utilities' },
    { id: PROPERTY_IDS.comptonRd, label: '166 Compton Rd', supplier: 'Energex Retail' },
  ].forEach((entry, index) => {
    utilityMonths.forEach((month) => {
      doc(
        `doc-utility-${index}-2026-${month}`,
        `${entry.supplier} ${entry.label} 2026-${month}.pdf`,
        'bill',
        `2026-${month}-22`,
        USER_IDS.mahvish,
        290_000,
        [{ type: 'property', propertyId: entry.id, label: entry.label }],
      );
    });
  });

  // Maintenance invoices and receipts.
  const maintenance = [
    { slug: 'pest-compton', name: 'Allpest QLD invoice 8841', on: '2026-08-18', property: PROPERTY_IDS.comptonRd, label: '166 Compton Rd' },
    { slug: 'pest-benton', name: 'Allpest QLD receipt 8902', on: '2026-08-13', property: PROPERTY_IDS.bentonSt, label: '20 Benton St' },
    { slug: 'plumb-compton', name: 'Ryan Plumbing invoice 1123', on: '2026-07-04', property: PROPERTY_IDS.comptonRd, label: '166 Compton Rd' },
    { slug: 'elec-benton', name: 'Sparks Electrical invoice 552', on: '2026-06-19', property: PROPERTY_IDS.bentonSt, label: '20 Benton St' },
    { slug: 'garden-mians', name: 'Greenline Gardening invoice 77', on: '2026-05-30', property: PROPERTY_IDS.miansRd, label: 'Mians Rd' },
    { slug: 'locks-compton', name: 'Southside Locksmiths invoice 210', on: '2026-05-12', property: PROPERTY_IDS.comptonRd, label: '166 Compton Rd' },
    { slug: 'paint-mians', name: 'Coastline Painting quote 4410', on: '2026-04-21', property: PROPERTY_IDS.miansRd, label: 'Mians Rd' },
    { slug: 'roof-watson', name: 'Apex Roofing invoice 3318', on: '2026-03-15', property: PROPERTY_IDS.watsonRd, label: 'Watson Rd' },
    { slug: 'fence-benton', name: 'Metro Fencing invoice 1902', on: '2026-01-19', property: PROPERTY_IDS.bentonSt, label: '20 Benton St' },
  ];
  maintenance.forEach((entry) => {
    doc(
      `doc-maint-${entry.slug}`,
      `${entry.name}.pdf`,
      entry.name.includes('receipt') ? 'receipt' : 'invoice',
      entry.on,
      USER_IDS.mahvish,
      210_000,
      [{ type: 'property', propertyId: entry.property, label: entry.label }],
    );
  });

  // Compliance certificates.
  [
    { slug: 'smoke-compton', name: 'Smoke alarm certificate 166 Compton Rd 2026', on: '2026-02-14', property: PROPERTY_IDS.comptonRd, label: '166 Compton Rd' },
    { slug: 'smoke-benton', name: 'Smoke alarm certificate 20 Benton St 2026', on: '2026-07-22', property: PROPERTY_IDS.bentonSt, label: '20 Benton St' },
    { slug: 'pool-watson', name: 'Pool safety certificate Watson Rd 2024', on: '2024-10-02', property: PROPERTY_IDS.watsonRd, label: 'Watson Rd' },
    { slug: 'elec-safety-compton', name: 'Electrical safety switch test 166 Compton Rd', on: '2026-03-08', property: PROPERTY_IDS.comptonRd, label: '166 Compton Rd' },
  ].forEach((entry) => {
    doc(
      `doc-compliance-${entry.slug}`,
      `${entry.name}.pdf`,
      'other',
      entry.on,
      USER_IDS.mahvish,
      160_000,
      [{ type: 'property', propertyId: entry.property, label: entry.label }],
      'compliance certificate',
    );
  });

  // Historical valuations.
  [
    { slug: 'compton-2024', name: 'Bank valuation 166 Compton Rd 2024', on: '2024-07-11', property: PROPERTY_IDS.comptonRd, label: '166 Compton Rd' },
    { slug: 'watson-2026', name: 'Bank valuation Watson Rd Mar 2026', on: '2026-03-06', property: PROPERTY_IDS.watsonRd, label: 'Watson Rd' },
    { slug: 'benton-2025', name: 'Agent appraisal 20 Benton St Jun 2025', on: '2025-06-12', property: PROPERTY_IDS.bentonSt, label: '20 Benton St' },
    { slug: 'mians-2023', name: 'Contract of sale Mians Rd 2023', on: '2023-05-02', property: PROPERTY_IDS.miansRd, label: 'Mians Rd' },
  ].forEach((entry) => {
    doc(
      `doc-val-${entry.slug}`,
      `${entry.name}.pdf`,
      'valuation',
      entry.on,
      USER_IDS.jawad,
      760_000,
      [{ type: 'property', propertyId: entry.property, label: entry.label }],
    );
  });

  // Entity and structuring records.
  [
    { slug: 'trust-deed', name: 'Siddique Family Trust deed 2019', on: '2019-06-04', entity: ENTITY_IDS.familyTrust, label: 'Siddique Family Trust' },
    { slug: 'trust-variation', name: 'Trust deed variation 2022', on: '2022-03-17', entity: ENTITY_IDS.familyTrust, label: 'Siddique Family Trust' },
    { slug: 'esteem-asic', name: 'Esteem Development ASIC annual statement 2026', on: '2026-02-01', entity: ENTITY_IDS.esteem, label: 'Esteem Development' },
    { slug: 'esteem-constitution', name: 'Esteem Development constitution', on: '2018-02-01', entity: ENTITY_IDS.esteem, label: 'Esteem Development' },
    { slug: 'smsf-deed', name: 'Siddique Superannuation Fund trust deed', on: '2020-04-01', entity: ENTITY_IDS.smsf, label: 'Siddique Superannuation Fund' },
    { slug: 'water-agreement', name: 'Water usage split agreement 60-40', on: '2026-09-05', entity: ENTITY_IDS.familyTrust, label: 'Siddique Family Trust' },
  ].forEach((entry) => {
    doc(
      `doc-${entry.slug}`,
      `${entry.name}.pdf`,
      'other',
      entry.on,
      USER_IDS.jawad,
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
    USER_IDS.mahvish,
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
        { type: 'lease', leaseId: ALL_LEASE_IDS.patelBenton, label: 'Lease 20B-WH' },
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
