/**
 * Transport-agnostic handlers for the loans module.
 */
import { resolveAsOfDate } from '@/shared/config/app-config';
import { asId } from '@/shared/types/common';
import type { Available } from '@/shared/lib/result';
import type { Money } from '@/shared/lib/money';
import { loansService } from './service';
import { loansRepository } from './repository';
import type { Loan } from './model';
import type { LoanQuery } from './validation';
import { accessService } from '@/modules/access/service';

export interface LoanSummary {
  readonly loan: Loan;
  readonly lvr: Available<number>;
}

export const loansApi = {
  list(query: LoanQuery): {
    readonly asOf: string;
    readonly items: readonly LoanSummary[];
    readonly totalDebt: Money;
    readonly totalReceivables: Money;
    readonly portfolioLvr: Available<number>;
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('loan.read');
    const asOf = query.asOf ?? resolveAsOfDate();
    const source =
      query.direction === 'all'
        ? loansRepository.list()
        : query.direction === 'liability'
          ? loansRepository.listLiabilities()
          : loansRepository.listReceivables();

    return {
      asOf,
      items: source.map((loan) => ({ loan, lvr: loansService.facilityLvr(loan.id, asOf) })),
      totalDebt: loansService.totalDebt(),
      totalReceivables: loansService.totalReceivables(),
      portfolioLvr: loansService.portfolioLvr(asOf),
    };
  },

  get(loanId: string, asOf?: string): LoanSummary {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('loan.read');
    const resolvedAsOf = asOf ?? resolveAsOfDate();
    const id = asId<'Loan'>(loanId);
    return { loan: loansService.require(id), lvr: loansService.facilityLvr(id, resolvedAsOf) };
  },
};
