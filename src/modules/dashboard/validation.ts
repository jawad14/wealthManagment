/**
 * Dashboard request validation.
 */
import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  /** Evaluate the read model at a specific date; defaults to the configured as-of date. */
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
