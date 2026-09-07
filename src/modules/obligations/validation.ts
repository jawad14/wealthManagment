/**
 * Obligations request validation (FR-03, FR-08).
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const obligationFilterSchema = z.object({
  filter: z.enum(['all', 'due-this-week', 'overdue', 'no-owner', 'paid']).default('all'),
  asOf: isoDate.optional(),
});

export type ObligationQuery = z.infer<typeof obligationFilterSchema>;

export const createObligationSchema = z.object({
  title: z.string().min(1, 'A title is required.').max(200),
  contextLabel: z.string().max(200).default(''),
  propertyId: z.string().min(1).optional(),
  dueOn: isoDate,
  recurrence: z.enum(['once', 'monthly', 'quarterly', 'yearly']).default('once'),
  ownerUserId: z.string().min(1).nullable().default(null),
  /** Major units; null for obligations with no fixed amount, such as a rate review. */
  amount: z.number().nonnegative().nullable().default(null),
});

export type CreateObligationInput = z.infer<typeof createObligationSchema>;

/**
 * Closing an obligation always requires evidence. The schema makes that
 * structural rather than a runtime check the caller could forget.
 */
export const recordPaymentSchema = z.object({
  paidOn: isoDate,
  documentId: z.string().min(1, 'Payment evidence is required to close an obligation.'),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const assignOwnerSchema = z.object({
  ownerUserId: z.string().min(1, 'Select an owner.'),
});
