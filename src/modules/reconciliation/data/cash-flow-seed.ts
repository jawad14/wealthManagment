/**
 * Posted monthly cash flow, March–August 2026.
 *
 * Cash basis (BR-03): internal transfers and loan drawdowns are already excluded
 * from these figures. Loan repayments are included as cash out, with the
 * principal portion tracked separately so the dashboard can explain the total.
 */
import { fromMajorUnits } from '@/shared/lib/money';
import type { PostedCashFlowMonth } from '../model';

/**
 * Earlier posted months.
 *
 * The chart shows the six most recent, so these change nothing on screen today —
 * they give period filters and any longer-range reporting real history to read.
 */
function earlierMonths(): PostedCashFlowMonth[] {
  const entries: readonly (readonly [string, number, number, number])[] = [
    ['2025-09-01', 24_180, 17_940, 8_620],
    ['2025-10-01', 24_650, 21_310, 8_670],
    ['2025-11-01', 24_900, 18_040, 8_720],
    ['2025-12-01', 25_380, 19_760, 8_770],
    ['2026-01-01', 25_120, 18_460, 8_810],
    ['2026-02-01', 25_740, 17_980, 8_860],
  ];

  return entries.map(([month, receipts, outgoings, principal]) => ({
    id: `cf-${month.slice(0, 7)}`,
    month,
    receipts: fromMajorUnits(receipts),
    outgoings: fromMajorUnits(outgoings),
    loanPrincipalComponent: fromMajorUnits(principal),
  }));
}

export function seedPostedCashFlow(): readonly PostedCashFlowMonth[] {
  return [
    ...earlierMonths(),
    {
      id: 'cf-2026-03',
      month: '2026-03-01',
      receipts: fromMajorUnits(26_000),
      outgoings: fromMajorUnits(18_800),
      loanPrincipalComponent: fromMajorUnits(8_910),
    },
    {
      id: 'cf-2026-04',
      month: '2026-04-01',
      receipts: fromMajorUnits(25_600),
      outgoings: fromMajorUnits(17_600),
      loanPrincipalComponent: fromMajorUnits(8_960),
    },
    {
      id: 'cf-2026-05',
      month: '2026-05-01',
      receipts: fromMajorUnits(25_000),
      outgoings: fromMajorUnits(22_000),
      loanPrincipalComponent: fromMajorUnits(9_010),
      note: 'May includes $8,600 insurance',
    },
    {
      id: 'cf-2026-06',
      month: '2026-06-01',
      receipts: fromMajorUnits(26_200),
      outgoings: fromMajorUnits(18_200),
      loanPrincipalComponent: fromMajorUnits(9_060),
    },
    {
      id: 'cf-2026-07',
      month: '2026-07-01',
      receipts: fromMajorUnits(27_476),
      outgoings: fromMajorUnits(19_200),
      loanPrincipalComponent: fromMajorUnits(9_100),
    },
    {
      id: 'cf-2026-08',
      month: '2026-08-01',
      receipts: fromMajorUnits(28_410),
      outgoings: fromMajorUnits(19_870),
      loanPrincipalComponent: fromMajorUnits(9_140),
    },
  ];
}
