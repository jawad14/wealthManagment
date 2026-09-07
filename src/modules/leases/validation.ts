/**
 * Leases request validation (FR-05).
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const leaseFilterSchema = z.object({
  filter: z.enum(['active', 'ending-soon', 'ended']).default('active'),
  asOf: isoDate.optional(),
});

export type LeaseQuery = z.infer<typeof leaseFilterSchema>;

export const createLeaseSchema = z
  .object({
    tenantId: z.string().min(1, 'Select or add a tenant.'),
    propertyId: z.string().min(1),
    componentId: z.string().min(1).nullable().default(null),
    reference: z.string().min(1, 'A billing reference is required so receipts can auto-match.').max(40),
    startsOn: isoDate,
    endsOn: isoDate,
    /** Major units. */
    rent: z.number().positive('Rent must be greater than zero.'),
    frequency: z.enum(['weekly', 'fortnightly', 'monthly']),
    bond: z.number().nonnegative().optional(),
    remindersEnabled: z.boolean().default(true),
  })
  .refine((value) => value.endsOn > value.startsOn, {
    path: ['endsOn'],
    message: 'The end date must be after the start date.',
  });

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;

export const arrearsQuerySchema = z.object({ asOf: isoDate.optional() });
