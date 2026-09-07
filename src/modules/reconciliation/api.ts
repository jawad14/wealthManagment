/**
 * Transport-agnostic handlers for the reconciliation module.
 */
import { NotFoundError } from '@/shared/lib/errors';
import { asId, type UserId } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import { reconciliationService } from './service';
import type { BankImport, ImportSummary, StagedTransaction } from './model';
import type { ConfirmTransactionInput, TransactionQuery } from './validation';

export const reconciliationApi = {
  current(query: TransactionQuery): {
    readonly bankImport: BankImport;
    readonly summary: ImportSummary;
    readonly transactions: readonly StagedTransaction[];
    readonly highConfidenceCount: number;
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('bank-import.read');
    const bankImport = reconciliationService.currentImport();
    if (!bankImport) throw new NotFoundError('Bank import', 'current');

    return {
      bankImport,
      summary: reconciliationService.summarise(bankImport.id),
      transactions: reconciliationService.listTransactions(bankImport.id, query.filter),
      highConfidenceCount: reconciliationService.highConfidenceCount(bankImport.id),
    };
  },

  confirm(transactionId: string, input: ConfirmTransactionInput, actor?: UserId): StagedTransaction {
    return reconciliationService.confirm({
      transactionId: asId<'BankTransaction'>(transactionId),
      actor: actor ?? accessService.getCurrentUser().id,
      ...(input.correctionNote ? { correctionNote: input.correctionNote } : {}),
    });
  },

  /** Bulk-confirm high-confidence rows only; low-confidence rows are never swept up. */
  confirmAllHighConfidence(actor?: UserId): { readonly confirmed: number } {
    const bankImport = reconciliationService.currentImport();
    if (!bankImport) throw new NotFoundError('Bank import', 'current');
    return {
      confirmed: reconciliationService.confirmAllHighConfidence(
        bankImport.id,
        actor ?? accessService.getCurrentUser().id,
      ),
    };
  },
};
