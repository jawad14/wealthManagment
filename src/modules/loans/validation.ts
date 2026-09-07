/**
 * Loans request validation (FR-03, BR-04, FR-11).
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const loanQuerySchema = z.object({
  direction: z.enum(['all', 'liability', 'receivable']).default('all'),
  asOf: isoDate.optional(),
});

export type LoanQuery = z.infer<typeof loanQuerySchema>;

export const createLoanSchema = z
  .object({
    lender: z.string().min(1).max(120),
    facilityName: z.string().min(1).max(120),
    direction: z.enum(['liability', 'receivable']),
    counterpartyLabel: z.string().min(1).max(160),
    borrowerEntityIds: z.array(z.string().min(1)).min(1, 'Name at least one party.'),
    /** Major units, always a positive magnitude; `direction` carries the meaning. */
    balance: z.number().positive(),
    balanceAsOf: isoDate,
    annualRate: z.number().min(0).max(1, 'Express the rate as a fraction, e.g. 0.0589.'),
    rateType: z.enum(['fixed', 'variable']),
    repaymentType: z.enum(['P&I', 'IO', 'custom']),
    monthlyRepayment: z.number().nonnegative(),
    securityKind: z.enum(['single', 'pool', 'unsecured']),
    securityPropertyIds: z.array(z.string().min(1)).default([]),
  })
  .refine(
    (value) => value.securityKind === 'unsecured' || value.securityPropertyIds.length > 0,
    { path: ['securityPropertyIds'], message: 'A secured facility must name its collateral.' },
  )
  .refine((value) => value.securityKind !== 'pool' || value.securityPropertyIds.length > 1, {
    path: ['securityPropertyIds'],
    message: 'A pooled facility must name more than one property.',
  });

export type CreateLoanInput = z.infer<typeof createLoanSchema>;

/** Approving an allocation policy is what allows pooled per-property ratios (BR-04). */
export const allocationPolicySchema = z.object({
  kind: z.enum(['equal-split', 'by-valuation', 'manual']),
  approved: z.boolean(),
  note: z.string().max(200).default(''),
});
