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
  /**
   * The import currently being worked on — the most recent one. Two imports on
   * the same day are ordered by insertion, newest first (the sort is stable).
   */
  latestImport: (): BankImport | undefined =>
    [...imports.list()].reverse().sort((a, b) => b.importedOn.localeCompare(a.importedOn))[0],
  insertImport: (record: BankImport): BankImport => imports.insert(record),
  updateImport: (id: BankImportId, changes: Partial<Omit<BankImport, 'id'>>): BankImport | undefined =>
    imports.update(id, changes),

  listTransactions: (importId: BankImportId): readonly StagedTransaction[] =>
    [...transactions.where((txn) => txn.importId === importId)].sort((a, b) => b.date.localeCompare(a.date)),
  /** Every staged row across every import — what duplicate detection compares against. */
  listAllTransactions: (): readonly StagedTransaction[] => transactions.list(),
  findTransaction: (id: BankTransactionId): StagedTransaction | undefined => transactions.find(id),
  insertTransaction: (txn: StagedTransaction): StagedTransaction => transactions.insert(txn),
  updateTransaction: (
    id: BankTransactionId,
    changes: Partial<Omit<StagedTransaction, 'id'>>,
  ): StagedTransaction | undefined => transactions.update(id, changes),

  /** Posted monthly cash flow, oldest first. */
  listPostedCashFlow: (): readonly PostedCashFlowMonth[] =>
    [...cashFlow.list()].sort((a, b) => a.month.localeCompare(b.month)),
  findPostedCashFlow: (month: string): PostedCashFlowMonth | undefined =>
    cashFlow.findBy((entry) => entry.month === month),
  insertPostedCashFlow: (entry: PostedCashFlowMonth): PostedCashFlowMonth => cashFlow.insert(entry),
  updatePostedCashFlow: (
    id: string,
    changes: Partial<Omit<PostedCashFlowMonth, 'id'>>,
  ): PostedCashFlowMonth | undefined => cashFlow.update(id, changes),

  /** Restore the seeded fixture — used by tests. */
  reset: (): void => {
    imports.reset();
    transactions.reset();
    cashFlow.reset();
  },
};
