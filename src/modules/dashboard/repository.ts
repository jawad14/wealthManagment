/**
 * Dashboard data access — portfolio snapshots only.
 */
import { createCollection } from '@/server/db/collection';
import type { IsoDate } from '@/shared/types/common';
import type { PortfolioSnapshot } from './model';
import { seedPortfolioSnapshots } from './data/seed';

const snapshots = createCollection<PortfolioSnapshot>('dashboard.snapshots', seedPortfolioSnapshots);

export const dashboardRepository = {
  listSnapshots: (): readonly PortfolioSnapshot[] =>
    [...snapshots.list()].sort((a, b) => a.asOf.localeCompare(b.asOf)),
  /** Most recent snapshot at or before `asOf`. */
  latestSnapshot: (asOf: IsoDate): PortfolioSnapshot | undefined =>
    [...snapshots.list()].filter((snapshot) => snapshot.asOf <= asOf).sort((a, b) => b.asOf.localeCompare(a.asOf))[0],
};
