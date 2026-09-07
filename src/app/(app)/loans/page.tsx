import type { Metadata } from 'next';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { loansService } from '@/modules/loans/service';
import { LoansScreen, type LoanRow } from '@/modules/loans/components/LoansScreen';
import { formatMonthShort, toDate } from '@/shared/lib/dates';

export const metadata: Metadata = { title: 'Loans & liabilities · Holdfast' };

/** FR-03, BR-04, FR-11 — facilities, ratios and receivables. */
export default function LoansPage() {
  const asOf = resolveAsOfDate();

  const rows: readonly LoanRow[] = loansService.list().map((loan) => ({
    loan,
    lvr: loansService.facilityLvr(loan.id, asOf),
    lvrReason: loansService.facilityLvrReason(loan.id, asOf),
  }));

  const range = loansService.collateralValuationRange(asOf);
  const collateralRangeLabel = range
    ? `${formatMonthShort(range.from)} ${toDate(range.from).getUTCFullYear()}–${formatMonthShort(range.to)} ${toDate(
        range.to,
      ).getUTCFullYear()}`
    : null;

  const review = loansService.nextRateReview(asOf);

  return (
    <LoansScreen
      rows={rows}
      totalDebt={loansService.totalDebt()}
      facilityCount={rows.filter((row) => row.loan.direction === 'liability').length}
      portfolioLvr={loansService.portfolioLvr(asOf)}
      collateralRangeLabel={collateralRangeLabel}
      repayments={loansService.monthlyRepayments()}
      nextReview={
        review
          ? {
              on: review.on,
              detail: `${review.loan.security.label} · ${review.loan.rate.type} ${(review.loan.rate.annual * 100).toFixed(2)}% ends`,
            }
          : null
      }
    />
  );
}
