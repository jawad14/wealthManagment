/**
 * Seeded portfolio snapshots.
 *
 * The June figures are set so the reported movements match the design prototype
 * exactly (+2.1% net worth, $14,200 of principal repaid) while the current
 * totals stay derived from live records.
 */
import { fromMajorUnits } from '@/shared/lib/money';
import type { PortfolioSnapshot } from '../model';

export function seedPortfolioSnapshots(): readonly PortfolioSnapshot[] {
  return [
    {
      id: 'snap-2026-06',
      asOf: '2026-06-30',
      netWorth: fromMajorUnits(2_118_805),
      assets: fromMajorUnits(4_339_705),
      liabilities: fromMajorUnits(2_220_900),
      label: 'Jun 2026 snapshot',
    },
  ];
}
