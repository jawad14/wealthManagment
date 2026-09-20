import { z } from 'zod';

export const searchQuerySchema = z.object({
  /** Absent and empty both mean "no query", which returns no results. */
  q: z.string().max(100, 'Search for 100 characters or fewer.').default(''),
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-09-06.')
    .optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
