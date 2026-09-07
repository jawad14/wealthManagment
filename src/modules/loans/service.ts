/**
 * Loans business logic (BR-04).
 *
 * Every ratio returns `Available<T>` rather than a bare number, so a missing or
 * stale valuation can never be rendered as "0%". Callers must handle the
 * unavailable branch explicitly — that is the point.
 */
import { NotFoundError } from '@/shared/lib/errors';
import { available, unavailable, type Available } from '@/shared/lib/result';
import { scaleMoney, sumMoney, type Money, money } from '@/shared/lib/money';
import type { IsoDate, LoanId, PropertyId } from '@/shared/types/common';
import { propertiesService } from '@/modules/properties/service';
import { loansRepository } from './repository';
import type { Loan, RatioUnavailableReason } from './model';

export interface PropertyDebt {
  /** Debt attributed to this property. */
  readonly amount: Money;
  /** Set when the amount comes from an unapproved pool allocation policy. */
  readonly viaPolicy?: { readonly label: string; readonly approved: boolean };
  readonly facilityLabel: string;
}

export const loansService = {
  list(): readonly Loan[] {
    return loansRepository.list();
  },

  require(id: LoanId): Loan {
    const loan = loansRepository.find(id);
    if (!loan) throw new NotFoundError('Loan', id);
    return loan;
  },

  /** Total money owed. Receivables are excluded — they are assets (FR-11). */
  totalDebt(): Money {
    return sumMoney(loansRepository.listLiabilities().map((loan) => loan.balance));
  },

  /** Total money owed to the portfolio (FR-11). */
  totalReceivables(): Money {
    return sumMoney(loansRepository.listReceivables().map((loan) => loan.balance));
  },

  /** Scheduled monthly repayments across liabilities, split into components. */
  monthlyRepayments(): { readonly total: Money; readonly principal: Money; readonly interest: Money } {
    const liabilities = loansRepository.listLiabilities();
    return {
      total: sumMoney(liabilities.map((loan) => loan.repayment.monthly)),
      principal: sumMoney(liabilities.map((loan) => loan.repayment.principalComponent)),
      interest: sumMoney(liabilities.map((loan) => loan.repayment.interestComponent)),
    };
  },

  /** The soonest upcoming rate review across all facilities. */
  nextRateReview(asOf: IsoDate): { readonly loan: Loan; readonly on: IsoDate } | null {
    const upcoming = loansRepository
      .list()
      .flatMap((loan) => (loan.rateReviewOn && loan.rateReviewOn >= asOf ? [{ loan, on: loan.rateReviewOn }] : []))
      .sort((a, b) => a.on.localeCompare(b.on));
    return upcoming[0] ?? null;
  },

  /**
   * Loan-to-value for a single facility.
   *
   * Unavailable when the facility is unsecured, when it is pooled without an
   * approved allocation policy, or when any securing property lacks a valuation
   * that is eligible for ratio maths.
   */
  facilityLvr(loanId: LoanId, asOf: IsoDate): Available<number> {
    const loan = loansService.require(loanId);
    if (loan.direction === 'receivable' || loan.security.kind === 'unsecured') {
      return unavailable<number>('not-secured');
    }
    if (loan.security.kind === 'pool' && !loan.allocationPolicy?.approved) {
      return unavailable<number>('pool-without-policy');
    }

    const statuses = loan.security.propertyIds.map((id) => propertiesService.valuationStatus(id, asOf));
    if (statuses.some((status) => status.valuation === null)) return unavailable<number>('no-valuation');
    if (statuses.some((status) => !status.eligibleForRatios)) return unavailable<number>('stale-valuation');

    const collateral = sumMoney(statuses.map((status) => status.valuation?.amount ?? money(0)));
    if (collateral.cents === 0) return unavailable<number>('no-valuation');
    return available(loan.balance.cents / collateral.cents);
  },

  /** Machine-readable reason so views can pick the right chip wording. */
  facilityLvrReason(loanId: LoanId, asOf: IsoDate): RatioUnavailableReason | null {
    const result = loansService.facilityLvr(loanId, asOf);
    return result.available ? null : (result.reason as RatioUnavailableReason);
  },

  /**
   * Debt attributed to one property.
   *
   * For a solely-secured facility this is the whole balance. For a pool it is
   * the share the allocation policy implies, tagged with whether that policy has
   * been approved so the UI can mark the figure as provisional.
   */
  debtForProperty(propertyId: PropertyId): PropertyDebt | null {
    const facilities = loansRepository
      .listSecuredBy(propertyId)
      .filter((loan) => loan.direction === 'liability');
    if (facilities.length === 0) return null;

    const parts = facilities.map((loan) => {
      if (loan.security.kind !== 'pool') {
        return { amount: loan.balance, policy: undefined, label: `${loan.lender} ${loan.facilityName.split(' ').pop() ?? ''}`.trim() };
      }
      const policy = loan.allocationPolicy;
      const share = policy?.kind === 'equal-split' ? 1 / loan.security.propertyIds.length : 0;
      return {
        amount: scaleMoney(loan.balance, share),
        policy,
        label: `${loan.lender} ${loan.facilityName.split(' ').pop() ?? ''} · ${policy?.note ?? 'no policy'}`.trim(),
      };
    });

    const pooled = parts.find((part) => part.policy !== undefined);
    return {
      amount: sumMoney(parts.map((part) => part.amount)),
      ...(pooled?.policy ? { viaPolicy: { label: pooled.policy.note, approved: pooled.policy.approved } } : {}),
      facilityLabel: parts.map((part) => part.label).join(' · '),
    };
  },

  /** Per-property LVR: property debt over its own eligible valuation. */
  propertyLvr(propertyId: PropertyId, asOf: IsoDate): Available<number> {
    const debt = loansService.debtForProperty(propertyId);
    if (!debt) return unavailable<number>('not-secured');

    // A provisional pool allocation must not be published as a ratio.
    if (debt.viaPolicy && !debt.viaPolicy.approved) return unavailable<number>('pool-without-policy');

    const status = propertiesService.valuationStatus(propertyId, asOf);
    if (!status.valuation) return unavailable<number>('no-valuation');
    if (!status.eligibleForRatios) return unavailable<number>('stale-valuation');
    return available(debt.amount.cents / status.valuation.amount.cents);
  },

  /**
   * Portfolio LVR across the collateral pool.
   *
   * Deliberately strict: if any property securing debt lacks an eligible
   * valuation, the denominator is incomplete and the ratio would understate
   * gearing. "Unavailable beats zero" — and it also beats a flattering number.
   */
  portfolioLvr(asOf: IsoDate): Available<number> {
    const liabilities = loansRepository.listLiabilities();
    const securingPropertyIds = [...new Set(liabilities.flatMap((loan) => loan.security.propertyIds))];
    if (securingPropertyIds.length === 0) return unavailable<number>('not-secured');

    const statuses = securingPropertyIds.map((id) => ({
      id,
      status: propertiesService.valuationStatus(id, asOf),
    }));

    const ineligible = statuses.filter((entry) => !entry.status.eligibleForRatios);
    if (ineligible.length > 0) {
      const noun = ineligible.length === 1 ? 'property' : 'properties';
      return unavailable<number>(
        `${ineligible.length} securing ${noun} without an eligible valuation`,
      );
    }

    const collateral = sumMoney(statuses.map((entry) => entry.status.valuation?.amount ?? money(0)));
    if (collateral.cents === 0) return unavailable<number>('no-valuation');
    return available(loansService.totalDebt().cents / collateral.cents);
  },

  /** Range of valuation dates backing the collateral pool, for the KPI subtitle. */
  collateralValuationRange(asOf: IsoDate): { readonly from: IsoDate; readonly to: IsoDate } | null {
    const securingPropertyIds = [
      ...new Set(loansRepository.listLiabilities().flatMap((loan) => loan.security.propertyIds)),
    ];
    const dates = securingPropertyIds
      .map((id) => propertiesService.valuationStatus(id, asOf).valuation?.valuedOn)
      .filter((date): date is IsoDate => date !== undefined)
      .sort();
    const from = dates[0];
    const to = dates[dates.length - 1];
    if (!from || !to) return null;
    return { from, to };
  },
};
