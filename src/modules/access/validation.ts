/**
 * Request validation schemas for the access module.
 */
import { z } from 'zod';

export const auditQuerySchema = z.object({
  /** Cap the number of returned events; omitted means "all". */
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const inviteSchema = z.object({
  name: z.string().min(1, 'A name is required.').max(120),
  email: z.string().email('Enter a valid email address.'),
  role: z.enum(['operations-delegate', 'family-contributor', 'accountant-readonly']),
  /** Read-only external grants must be time-limited. */
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').optional(),
}).refine(
  (value) => value.role !== 'accountant-readonly' || value.expiresOn !== undefined,
  { path: ['expiresOn'], message: 'External read-only grants must have an expiry date.' },
);

export type InviteInput = z.infer<typeof inviteSchema>;
