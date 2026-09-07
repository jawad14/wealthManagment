/**
 * Loans data access.
 */
import { createCollection } from '@/server/db/collection';
import type { LoanId, PropertyId } from '@/shared/types/common';
import type { Loan } from './model';
import { seedLoans } from './data/seed';

const loans = createCollection<Loan>('loans.loans', seedLoans);

export const loansRepository = {
  list: (): readonly Loan[] => loans.list(),
  find: (id: LoanId): Loan | undefined => loans.find(id),
  listLiabilities: (): readonly Loan[] => loans.where((loan) => loan.direction === 'liability'),
  listReceivables: (): readonly Loan[] => loans.where((loan) => loan.direction === 'receivable'),
  /** Facilities secured by a property, whether solely or as part of a pool. */
  listSecuredBy: (propertyId: PropertyId): readonly Loan[] =>
    loans.where((loan) => loan.security.propertyIds.includes(propertyId)),
};
