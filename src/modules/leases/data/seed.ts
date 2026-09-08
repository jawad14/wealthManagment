/**
 * Seeded tenants, leases, rent charges and allocations.
 *
 * Charges and allocations are seeded so the derived arrears reproduce the
 * prototype's figures exactly: Nguyen $200, Patel $690, Okafor $350
 * (portfolio total $1,240), with Williams $340 paid ahead.
 */
import { asId } from '@/shared/types/common';
import { fromMajorUnits } from '@/shared/lib/money';
import { PROPERTY_IDS, COMPONENT_IDS } from '@/modules/properties/data/seed';
import type { Lease, RentAllocation, RentCharge, Tenant } from '../model';

export const TENANT_IDS = {
  okafor: asId<'Tenant'>('ten-okafor'),
  chen: asId<'Tenant'>('ten-chen'),
  nguyen: asId<'Tenant'>('ten-nguyen'),
  williams: asId<'Tenant'>('ten-williams'),
  rahman: asId<'Tenant'>('ten-rahman'),
  patel: asId<'Tenant'>('ten-patel'),
  // Former tenants, retained because their leases and receipts stay on record.
  brooks: asId<'Tenant'>('ten-brooks'),
  ali: asId<'Tenant'>('ten-ali'),
  tran: asId<'Tenant'>('ten-tran'),
  mensah: asId<'Tenant'>('ten-mensah'),
  kaur: asId<'Tenant'>('ten-kaur'),
  doyle: asId<'Tenant'>('ten-doyle'),
};

export const LEASE_IDS = {
  okaforR1: asId<'Lease'>('lease-166c-r1'),
  chenR2: asId<'Lease'>('lease-166c-r2'),
  nguyenR3: asId<'Lease'>('lease-166c-r3'),
  williamsR4: asId<'Lease'>('lease-166c-r4'),
  rahmanR5: asId<'Lease'>('lease-166c-r5'),
  patelBenton: asId<'Lease'>('lease-20b-wh'),

  // Ended tenancies. Kept so paid history and the reasons for a vacancy stay
  // inspectable — an ended lease is never deleted.
  brooksR1: asId<'Lease'>('lease-166c-r1-prior'),
  aliR2: asId<'Lease'>('lease-166c-r2-prior'),
  tranR3: asId<'Lease'>('lease-166c-r3-prior'),
  mensahR6: asId<'Lease'>('lease-166c-r6-prior'),
  kaurMians: asId<'Lease'>('lease-mians-prior'),
  doyleBenton: asId<'Lease'>('lease-20b-prior'),
};

export function seedTenants(): readonly Tenant[] {
  return [
    { id: TENANT_IDS.okafor, name: 'L. Okafor' },
    { id: TENANT_IDS.chen, name: 'M. Chen' },
    { id: TENANT_IDS.nguyen, name: 'A. Nguyen' },
    { id: TENANT_IDS.williams, name: 'S. Williams' },
    { id: TENANT_IDS.rahman, name: 'D. Rahman' },
    { id: TENANT_IDS.patel, name: 'R. Patel' },
    { id: TENANT_IDS.brooks, name: 'T. Brooks' },
    { id: TENANT_IDS.ali, name: 'N. Ali' },
    { id: TENANT_IDS.tran, name: 'K. Tran' },
    { id: TENANT_IDS.mensah, name: 'E. Mensah' },
    { id: TENANT_IDS.kaur, name: 'P. Kaur' },
    { id: TENANT_IDS.doyle, name: 'C. Doyle' },
  ];
}

export function seedLeases(): readonly Lease[] {
  return [
    {
      id: LEASE_IDS.okaforR1,
      tenantId: TENANT_IDS.okafor,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom1,
      reference: '166C-R1',
      startsOn: '2026-02-01',
      endsOn: '2027-01-31',
      rent: fromMajorUnits(350),
      frequency: 'weekly',
      chargeAnchorOn: '2026-02-02',
      remindersEnabled: true,
      disputed: true,
    },
    {
      id: LEASE_IDS.chenR2,
      tenantId: TENANT_IDS.chen,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom2,
      reference: '166C-R2',
      startsOn: '2026-04-15',
      endsOn: '2027-04-14',
      rent: fromMajorUnits(330),
      frequency: 'weekly',
      chargeAnchorOn: '2026-04-15',
      remindersEnabled: true,
      disputed: false,
    },
    {
      id: LEASE_IDS.nguyenR3,
      tenantId: TENANT_IDS.nguyen,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom3,
      reference: '166C-R3',
      startsOn: '2026-06-01',
      endsOn: '2027-05-31',
      rent: fromMajorUnits(500),
      frequency: 'fortnightly',
      chargeAnchorOn: '2026-06-02',
      remindersEnabled: true,
      disputed: false,
    },
    {
      id: LEASE_IDS.williamsR4,
      tenantId: TENANT_IDS.williams,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom4,
      reference: '166C-R4',
      startsOn: '2026-07-01',
      endsOn: '2027-06-30',
      rent: fromMajorUnits(340),
      frequency: 'weekly',
      chargeAnchorOn: '2026-07-01',
      remindersEnabled: true,
      disputed: false,
    },
    {
      id: LEASE_IDS.rahmanR5,
      tenantId: TENANT_IDS.rahman,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom5,
      reference: '166C-R5',
      startsOn: '2026-08-10',
      endsOn: '2027-08-09',
      rent: fromMajorUnits(360),
      frequency: 'weekly',
      chargeAnchorOn: '2026-08-10',
      remindersEnabled: true,
      disputed: false,
    },
    {
      id: LEASE_IDS.patelBenton,
      tenantId: TENANT_IDS.patel,
      propertyId: PROPERTY_IDS.bentonSt,
      componentId: COMPONENT_IDS.bentonWhole,
      reference: '20B-WH',
      startsOn: '2025-11-01',
      endsOn: '2026-10-31',
      rent: fromMajorUnits(1_380),
      frequency: 'fortnightly',
      chargeAnchorOn: '2025-11-04',
      remindersEnabled: true,
      disputed: false,
    },

    // ---- Ended tenancies ----
    {
      id: LEASE_IDS.brooksR1,
      tenantId: TENANT_IDS.brooks,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom1,
      reference: '166C-R1-P',
      startsOn: '2025-02-01',
      endsOn: '2026-01-31',
      rent: fromMajorUnits(330),
      frequency: 'weekly',
      chargeAnchorOn: '2025-02-03',
      remindersEnabled: false,
      disputed: false,
    },
    {
      id: LEASE_IDS.aliR2,
      tenantId: TENANT_IDS.ali,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom2,
      reference: '166C-R2-P',
      startsOn: '2025-04-15',
      endsOn: '2026-04-14',
      rent: fromMajorUnits(310),
      frequency: 'weekly',
      chargeAnchorOn: '2025-04-16',
      remindersEnabled: false,
      disputed: false,
    },
    {
      id: LEASE_IDS.tranR3,
      tenantId: TENANT_IDS.tran,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom3,
      reference: '166C-R3-P',
      startsOn: '2025-06-01',
      endsOn: '2026-05-31',
      rent: fromMajorUnits(460),
      frequency: 'fortnightly',
      chargeAnchorOn: '2025-06-03',
      remindersEnabled: false,
      disputed: false,
    },
    {
      // Explains why Room 6 shows "vacant since 24 Aug".
      id: LEASE_IDS.mensahR6,
      tenantId: TENANT_IDS.mensah,
      propertyId: PROPERTY_IDS.comptonRd,
      componentId: COMPONENT_IDS.comptonRoom6,
      reference: '166C-R6-P',
      startsOn: '2025-08-25',
      endsOn: '2026-08-24',
      rent: fromMajorUnits(345),
      frequency: 'weekly',
      chargeAnchorOn: '2025-08-25',
      remindersEnabled: false,
      disputed: false,
    },
    {
      // Explains why Mians Rd shows "Lease ended 20 Aug".
      id: LEASE_IDS.kaurMians,
      tenantId: TENANT_IDS.kaur,
      propertyId: PROPERTY_IDS.miansRd,
      componentId: COMPONENT_IDS.miansWhole,
      reference: 'MIANS-WH-P',
      startsOn: '2024-08-21',
      endsOn: '2026-08-20',
      rent: fromMajorUnits(560),
      frequency: 'weekly',
      chargeAnchorOn: '2024-08-21',
      remindersEnabled: false,
      disputed: false,
    },
    {
      id: LEASE_IDS.doyleBenton,
      tenantId: TENANT_IDS.doyle,
      propertyId: PROPERTY_IDS.bentonSt,
      componentId: COMPONENT_IDS.bentonWhole,
      reference: '20B-WH-P',
      startsOn: '2024-11-01',
      endsOn: '2025-10-31',
      rent: fromMajorUnits(1_290),
      frequency: 'fortnightly',
      chargeAnchorOn: '2024-11-05',
      remindersEnabled: false,
      disputed: false,
    },
  ];
}

/**
 * Outstanding charges only.
 *
 * Fully-settled history is omitted from the seed; a charge with a matching
 * allocation nets to zero and does not change any derived figure. Production
 * data would carry the full ledger.
 */
export function seedRentCharges(): readonly RentCharge[] {
  return [
    // Okafor — one unpaid week, lease is disputed so reminders are paused.
    { id: asId<'RentCharge'>('chg-okafor-0831'), leaseId: LEASE_IDS.okaforR1, dueOn: '2026-08-31', amount: fromMajorUnits(350) },
    // Nguyen — fortnightly charge part-paid by the 28 Aug bank receipt.
    { id: asId<'RentCharge'>('chg-nguyen-0825'), leaseId: LEASE_IDS.nguyenR3, dueOn: '2026-08-25', amount: fromMajorUnits(500) },
    // Patel — fortnightly charge half-paid.
    { id: asId<'RentCharge'>('chg-patel-0828'), leaseId: LEASE_IDS.patelBenton, dueOn: '2026-08-28', amount: fromMajorUnits(1_380) },
    // Williams — charged and paid, plus a week paid in advance (see allocations).
    { id: asId<'RentCharge'>('chg-williams-0902'), leaseId: LEASE_IDS.williamsR4, dueOn: '2026-09-02', amount: fromMajorUnits(340) },
  ];
}

export function seedRentAllocations(): readonly RentAllocation[] {
  return [
    {
      id: 'alloc-nguyen-0828',
      chargeId: asId<'RentCharge'>('chg-nguyen-0825'),
      kind: 'receipt',
      amount: fromMajorUnits(300),
      receivedOn: '2026-08-28',
      bankTransactionId: 'txn-nguyen-rent-0828',
    },
    {
      id: 'alloc-patel-0829',
      chargeId: asId<'RentCharge'>('chg-patel-0828'),
      kind: 'receipt',
      amount: fromMajorUnits(690),
      receivedOn: '2026-08-29',
    },
    // Paid ahead: the 2 Sep charge is settled and a further $340 sits in credit.
    {
      id: 'alloc-williams-0901',
      kind: 'receipt',
      chargeId: asId<'RentCharge'>('chg-williams-0902'),
      amount: fromMajorUnits(680),
      receivedOn: '2026-09-01',
    },
  ];
}
