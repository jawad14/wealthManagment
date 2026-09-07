/**
 * Documents request validation (FR-04).
 */
import { z } from 'zod';

export const documentFilterSchema = z.object({
  filter: z
    .enum(['all', 'leases', 'insurance', 'invoices-receipts', 'loans', 'valuations', 'unlinked'])
    .default('all'),
});

export type DocumentQuery = z.infer<typeof documentFilterSchema>;

export const linkDocumentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('property'), propertyId: z.string().min(1), label: z.string().min(1) }),
  z.object({ type: z.literal('obligation'), obligationId: z.string().min(1), label: z.string().min(1) }),
  z.object({ type: z.literal('lease'), leaseId: z.string().min(1), label: z.string().min(1) }),
  z.object({ type: z.literal('loan'), loanId: z.string().min(1), label: z.string().min(1) }),
  z.object({ type: z.literal('valuation'), valuationId: z.string().min(1), label: z.string().min(1) }),
]);

export type LinkDocumentInput = z.infer<typeof linkDocumentSchema>;

export const uploadDocumentSchema = z.object({
  filename: z.string().min(1).max(255),
  type: z.enum(['lease', 'insurance-policy', 'bill', 'invoice', 'receipt', 'loan', 'valuation', 'other']),
  sizeBytes: z.number().int().positive().max(50_000_000, 'Files are limited to 50 MB.'),
  descriptor: z.string().max(200).optional(),
});
