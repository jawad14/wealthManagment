import type { Metadata } from 'next';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { leasesService, type LeaseFilter, type LeaseView } from '@/modules/leases/service';
import { LeasesScreen } from '@/modules/leases/components/LeasesScreen';

export const metadata: Metadata = { title: 'Leases & tenants · Holdfast' };

const FILTERS: readonly LeaseFilter[] = ['active', 'ending-soon', 'ended'];

/** FR-05 — leases and tenants. */
export default function LeasesPage() {
  const asOf = resolveAsOfDate();

  const viewsByFilter = FILTERS.reduce(
    (accumulator, filter) => ({ ...accumulator, [filter]: leasesService.listViews(asOf, filter) }),
    {} as Record<LeaseFilter, readonly LeaseView[]>,
  );

  return (
    <LeasesScreen
      viewsByFilter={viewsByFilter}
      counts={leasesService.counts(asOf)}
      newLease={{
        targetLabel: 'Room 6 · 166 Compton Rd',
        suggestedReference: '166C-R6',
        defaultStartsOn: '2026-09-15',
        defaultEndsOn: '2027-09-14',
        defaultRent: '$340.00',
        defaultBond: '$1,360.00',
        pendingPolicies: { bondHandling: true, proration: true },
      }}
    />
  );
}
