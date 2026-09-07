/**
 * Properties request validation.
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const propertyFilterSchema = z.object({
  filter: z.enum(['all', 'rented', 'own-home', 'stale-valuation']).default('all'),
  asOf: isoDate.optional(),
});

export type PropertyQuery = z.infer<typeof propertyFilterSchema>;

export const createValuationSchema = z.object({
  propertyId: z.string().min(1),
  /** Major units; converted to integer cents by the service. */
  amount: z.number().positive('A valuation must be greater than zero.'),
  basis: z.enum(['bank', 'agent-appraisal', 'purchase-price', 'at-cost']),
  valuedOn: isoDate,
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  datePrecision: z.enum(['day', 'month', 'year', 'none']).default('day'),
});

export type CreateValuationInput = z.infer<typeof createValuationSchema>;
