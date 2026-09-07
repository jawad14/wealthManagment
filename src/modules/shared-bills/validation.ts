/**
 * Shared bills request validation (FR-07).
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const sharedBillFilterSchema = z.object({
  filter: z.enum(['all', 'recoverable', 'owner-cost', 'needs-review', 'blocked']).default('all'),
});

export type SharedBillQuery = z.infer<typeof sharedBillFilterSchema>;

export const shareInputSchema = z.object({
  leaseId: z.string().min(1).nullable(),
  label: z.string().min(1).max(120),
  weight: z.number().nonnegative(),
  recoverable: z.boolean(),
});

export const createSharedBillSchema = z
  .object({
    propertyId: z.string().min(1),
    category: z.enum(['water', 'electricity', 'gas', 'internet', 'cleaning', 'other']),
    supplier: z.string().min(1).max(160),
    reference: z.string().max(60).optional(),
    /** Major units. */
    total: z.number().positive('A bill total must be greater than zero.'),
    periodFrom: isoDate,
    periodTo: isoDate,
    dueOn: isoDate,
    /** BR-06: the period the cost belongs to, distinct from when it was entered. */
    effectiveOn: isoDate,
    agreementId: z.string().min(1).nullable(),
    sourceDocumentId: z.string().min(1).optional(),
    shares: z.array(shareInputSchema).min(1, 'A bill needs at least one share.'),
  })
  .refine((value) => value.periodTo >= value.periodFrom, {
    path: ['periodTo'],
    message: 'The period end must not be before the period start.',
  });

export type CreateSharedBillInput = z.infer<typeof createSharedBillSchema>;

/**
 * Recoverability is a reviewed input, never a conclusion the platform derives.
 * The reviewer must state the date they reviewed it.
 */
export const recoveryReviewSchema = z.object({
  reviewedOn: isoDate,
  deadline: isoDate.nullable().default(null),
});
