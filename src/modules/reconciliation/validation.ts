/**
 * Reconciliation request validation (FR-06).
 */
import { z } from 'zod';

export const transactionQuerySchema = z.object({
  filter: z.enum(['all', 'auto-matched', 'needs-review', 'unmatched', 'confirmed']).default('all'),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;

/**
 * Confirming an unmatched row requires an explicit allocation. Without it the
 * row stays unposted — a suggestion never becomes a posting on its own.
 */
export const confirmTransactionSchema = z.object({
  correctionNote: z.string().max(400).optional(),
});

export type ConfirmTransactionInput = z.infer<typeof confirmTransactionSchema>;

export const allocateTransactionSchema = z.object({
  kind: z.enum(['rent', 'expense', 'transfer']),
  targetRef: z.string().min(1, 'Choose what this transaction relates to.'),
  propertyId: z.string().min(1).optional(),
  note: z.string().max(400).optional(),
});
