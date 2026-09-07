/**
 * Expenses request validation (FR-04).
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const expenseCategorySchema = z.enum([
  'insurance',
  'rates',
  'utilities',
  'repairs',
  'management',
  'body-corporate',
  'compliance',
  'loan-interest',
  'professional',
  'other',
]);

export const expenseQuerySchema = z.object({
  filter: z.enum(['all', 'corrected', 'voided', 'no-evidence', 'estimated']).default('all'),
  from: isoDate.optional(),
  to: isoDate.optional(),
  propertyId: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  category: expenseCategorySchema.optional(),
});

export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;

export const createExpenseSchema = z.object({
  /** Major units. */
  amount: z.number().positive('An expense must be greater than zero.'),
  category: expenseCategorySchema,
  effectiveOn: isoDate,
  description: z.string().min(1).max(300),
  basis: z.enum(['actual', 'forecast', 'estimated']).default('actual'),
  entityId: z.string().min(1, 'An expense must be attributed to an entity.'),
  propertyId: z.string().min(1).optional(),
  leaseId: z.string().min(1).optional(),
  obligationId: z.string().min(1).optional(),
  evidenceDocumentIds: z.array(z.string().min(1)).default([]),
});

/** A correction must say why; the reason is written into the audit trail. */
export const correctExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  category: expenseCategorySchema.optional(),
  effectiveOn: isoDate.optional(),
  description: z.string().min(1).max(300).optional(),
  reason: z.string().min(1, 'A correction must state why it was made.').max(300),
});

export const voidExpenseSchema = z.object({
  reason: z.string().min(1, 'Voiding an expense requires a reason.').max(300),
});
