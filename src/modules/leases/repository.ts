/**
 * Leases data access.
 */
import { createCollection } from '@/server/db/collection';
import type { LeaseId, PropertyId, RentChargeId, TenantId } from '@/shared/types/common';
import type { Lease, RentAllocation, RentCharge, Tenant } from './model';
import { seedLeases, seedRentAllocations, seedRentCharges, seedTenants } from './data/seed';

const tenants = createCollection<Tenant>('leases.tenants', seedTenants);
const leases = createCollection<Lease>('leases.leases', seedLeases);
const charges = createCollection<RentCharge>('leases.charges', seedRentCharges);
const allocations = createCollection<RentAllocation>('leases.allocations', seedRentAllocations);

export const leasesRepository = {
  listTenants: (): readonly Tenant[] => tenants.list(),
  findTenant: (id: TenantId): Tenant | undefined => tenants.find(id),
  insertTenant: (tenant: Tenant): Tenant => tenants.insert(tenant),

  list: (): readonly Lease[] => leases.list(),
  find: (id: LeaseId): Lease | undefined => leases.find(id),
  listForProperty: (propertyId: PropertyId): readonly Lease[] =>
    leases.where((lease) => lease.propertyId === propertyId),
  insert: (lease: Lease): Lease => leases.insert(lease),
  update: (id: LeaseId, changes: Partial<Omit<Lease, 'id'>>): Lease | undefined => leases.update(id, changes),

  listCharges: (leaseId: LeaseId): readonly RentCharge[] =>
    charges.where((charge) => charge.leaseId === leaseId),
  listAllCharges: (): readonly RentCharge[] => charges.list(),
  insertCharge: (charge: RentCharge): RentCharge => charges.insert(charge),
  updateCharge: (id: RentChargeId, changes: Partial<Omit<RentCharge, 'id'>>): RentCharge | undefined =>
    charges.update(id, changes),
  removeCharge: (id: RentChargeId): boolean => charges.remove(id),

  listAllocations: (chargeId: RentChargeId): readonly RentAllocation[] =>
    allocations.where((allocation) => allocation.chargeId === chargeId),
  listAllAllocations: (): readonly RentAllocation[] => allocations.list(),
  insertAllocation: (allocation: RentAllocation): RentAllocation => allocations.insert(allocation),

  /** Restore every collection to its seeded state. Used by tests. */
  reset: (): void => {
    tenants.reset();
    leases.reset();
    charges.reset();
    allocations.reset();
  },
};
