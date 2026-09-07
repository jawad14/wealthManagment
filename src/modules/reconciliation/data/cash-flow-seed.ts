/**
 * Posted monthly cash flow, March–August 2026.
 *
 * Cash basis (BR-03): internal transfers and loan drawdowns are already excluded
 * from these figures. Loan repayments are included as cash out, with the
 * principal portion tracked separately so the dashboard can explain the total.
 */
import { fromMajorUnits } from '@/shared/lib/money';
import type { PostedCashFlowMonth } from '../model';

export function seedPostedCashFlow(): readonly PostedCashFlowMonth[] {
  return [
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
