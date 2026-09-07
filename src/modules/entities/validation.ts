/**
 * Entities request validation.
 *
 * The share/control split is enforced here as well as in the domain guard, so an
 * invalid relationship is rejected at the boundary with a useful message rather
 * than throwing deeper in.
 */
import { z } from 'zod';

export const entityKindSchema = z.enum(['individual', 'company', 'trust', 'smsf']);

export const entityFilterSchema = z.object({
  filter: z.union([z.literal('all'), entityKindSchema]).default('all'),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type EntityQuery = z.infer<typeof entityFilterSchema>;

export const createEntitySchema = z.object({
  name: z.string().min(1, 'A name is required.').max(200),
  kind: entityKindSchema,
  descriptor: z.string().max(200).default(''),
  consolidation: z.enum(['look-through', 'manual-summary', 'excluded']).default('look-through'),
});

const controlKinds = ['director-of', 'trustee-of', 'beneficiary-of', 'member-of', 'borrower-of'] as const;

export const createRelationshipSchema = z
  .object({
    subjectEntityId: z.string().min(1),
    kind: z.union([z.literal('owns'), z.enum(controlKinds)]),
    targetPropertyId: z.string().min(1).optional(),
    targetEntityId: z.string().min(1).optional(),
    sharePercent: z.number().min(0).max(100).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    label: z.string().min(1).max(200),
  })
  .refine((value) => value.kind !== 'owns' || value.sharePercent !== undefined, {
    path: ['sharePercent'],
    message: 'An ownership relationship must state a share.',
  })
  .refine((value) => value.kind === 'owns' || value.sharePercent === undefined, {
    path: ['sharePercent'],
    message: 'A control relationship cannot carry an ownership share (BR-02).',
  })
  .refine((value) => Boolean(value.targetPropertyId) !== Boolean(value.targetEntityId), {
    path: ['targetPropertyId'],
    message: 'Provide exactly one target: a property or an entity.',
  });

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
