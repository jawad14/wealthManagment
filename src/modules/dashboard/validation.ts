/**
 * Dashboard request validation.
 */
import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  /** Evaluate the read model at a specific date; defaults to the configured as-of date. */
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').optional(),
  /** Narrow the balance-sheet figures to one consolidated entity; omit for the whole portfolio. */
  entityId: z.string().min(1).max(64).optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
