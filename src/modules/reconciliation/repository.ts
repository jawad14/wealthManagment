/**
 * Reconciliation data access.
 */
import { createCollection } from '@/server/db/collection';
import type { BankImportId, BankTransactionId } from '@/shared/types/common';
import type { BankImport, PostedCashFlowMonth, StagedTransaction } from './model';
import { seedBankImports, seedStagedTransactions } from './data/seed';
import { seedPostedCashFlow } from './data/cash-flow-seed';

const imports = createCollection<BankImport>('reconciliation.imports', seedBankImports);
const transactions = createCollection<StagedTransaction>('reconciliation.transactions', seedStagedTransactions);
const cashFlow = createCollection<PostedCashFlowMonth>('reconciliation.cashFlow', seedPostedCashFlow);

export const reconciliationRepository = {
  listImports: (): readonly BankImport[] => imports.list(),
  findImport: (id: BankImportId): BankImport | undefined => imports.find(id),
  /** The import currently being worked on — the most recent one. */
  latestImport: (): BankImport | undefined =>
    [...imports.list()].sort((a, b) => b.importedOn.localeCompare(a.importedOn))[0],

  listTransactions: (importId: BankImportId): readonly StagedTransaction[] =>
    [...transactions.where((txn) => txn.importId === importId)].sort((a, b) => b.date.localeCompare(a.date)),
  findTransaction: (id: BankTransactionId): StagedTransaction | undefined => transactions.find(id),
  updateTransaction: (
    id: BankTransactionId,
    changes: Partial<Omit<StagedTransaction, 'id'>>,
  ): StagedTransaction | undefined => transactions.update(id, changes),

  /** Posted monthly cash flow, oldest first. */
  listPostedCashFlow: (): readonly PostedCashFlowMonth[] =>
    [...cashFlow.list()].sort((a, b) => a.month.localeCompare(b.month)),
  findPostedCashFlow: (month: string): PostedCashFlowMonth | undefined =>
    cashFlow.findBy((entry) => entry.month === month),
};
