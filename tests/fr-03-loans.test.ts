/**
 * FR-03 / FR-11 — adding a facility from the Loans screen.
 *
 * The action is called directly with a FormData, so this covers form parsing as
 * well as the rule the screen exists to protect: a receivable is an asset and
 * never reaches total debt.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Actions call revalidatePath, which needs a request scope that does not exist
// in a unit test. The cache behaviour is Next's; what matters here is the write.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createLoanAction } from '@/modules/loans/actions';
import { loansRepository } from '@/modules/loans/repository';
import { loansService } from '@/modules/loans/service';
import type { Loan } from '@/modules/loans/model';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';

const idle = IDLE_RESULT as ActionResult<unknown>;
const AS_OF = '2026-09-06';

/** Build a FormData the way a browser would. */
function formOf(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

const VALID = {
  lender: 'Commonwealth Bank',
  facilityName: 'Residential Variable Mortgage',
  direction: 'liability',
  counterpartyLabel: 'Holdfast Family Trust',
  balance: '$526,000.00',
  balanceAsOf: '2026-09-01',
  annualRate: '5.85',
  rateType: 'variable',
  repaymentType: 'P&I',
  monthlyRepayment: '3,200',
};

function createdLoan(result: ActionResult<unknown>): Loan {
  if (!result.ok) throw new Error(`expected success, got: ${result.message}`);
  return result.value as Loan;
}

beforeEach(() => {
  loansRepository.reset();
});

describe('createLoanAction — validation', () => {
  it('rejects a facility with no name', async () => {
    const before = loansRepository.list().length;
    const result = await createLoanAction(idle, formOf({ ...VALID, facilityName: '  ' }));
    expect(result.ok).toBe(false);
    expect(loansRepository.list()).toHaveLength(before);
  });

  it('rejects a zero balance and marks the field', async () => {
    const before = loansRepository.list().length;
    const result = await createLoanAction(idle, formOf({ ...VALID, balance: '0' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.balance).toBeDefined();
    expect(loansRepository.list()).toHaveLength(before);
  });

  it('rejects a missing balance rather than treating it as zero', async () => {
    const result = await createLoanAction(idle, formOf({ ...VALID, balance: '' }));
    expect(result.ok).toBe(false);
  });

  it('rejects a security property that does not exist', async () => {
    const result = await createLoanAction(idle, formOf({ ...VALID, securityPropertyId: 'prop-nope' }));
    expect(result.ok).toBe(false);
  });
});

describe('createLoanAction — liability', () => {
  it('increases total debt and produces a facility LVR', async () => {
    const debtBefore = loansService.totalDebt().cents;

    // Watson Rd carries a current bank valuation of $1,052,000, so a $526,000
    // facility secured on it alone is geared at exactly 50%.
    const result = await createLoanAction(idle, formOf({ ...VALID, securityPropertyId: PROPERTY_IDS.watsonRd }));
    const loan = createdLoan(result);

    expect(loansService.totalDebt().cents).toBe(debtBefore + 52_600_000);
    expect(loan.security.kind).toBe('single');
    expect(loan.security.propertyIds).toEqual([PROPERTY_IDS.watsonRd]);

    const lvr = loansService.facilityLvr(loan.id, AS_OF);
    expect(lvr.available).toBe(true);
    if (lvr.available) expect(lvr.value).toBeCloseTo(0.5, 10);
  });

  it('stores the rate as a fraction and keeps the repayment split whole', async () => {
    const loan = createdLoan(await createLoanAction(idle, formOf(VALID)));

    expect(loan.rate.annual).toBeCloseTo(0.0585, 10);
    expect(loan.repayment.monthly.cents).toBe(320_000);
    expect(loan.repayment.principalComponent.cents + loan.repayment.interestComponent.cents).toBe(320_000);
    expect(loan.repayment.principalComponent.cents).toBeGreaterThanOrEqual(0);
  });

  it('is unsecured when no property is chosen, so no LVR is published', async () => {
    const loan = createdLoan(await createLoanAction(idle, formOf({ ...VALID, securityPropertyId: '' })));

    expect(loan.security).toEqual({ kind: 'unsecured', propertyIds: [], label: 'Unsecured' });
    expect(loansService.facilityLvr(loan.id, AS_OF).available).toBe(false);
  });
});

describe('createLoanAction — receivable (FR-11)', () => {
  it('increases receivables and leaves total debt untouched', async () => {
    const debtBefore = loansService.totalDebt().cents;
    const receivablesBefore = loansService.totalReceivables().cents;

    const result = await createLoanAction(
      idle,
      formOf({ ...VALID, direction: 'receivable', facilityName: 'Loan to A. Rahman', balance: '40000' }),
    );
    const loan = createdLoan(result);

    expect(loan.direction).toBe('receivable');
    expect(loansService.totalReceivables().cents).toBe(receivablesBefore + 4_000_000);
    expect(loansService.totalDebt().cents).toBe(debtBefore);
    expect(loansService.facilityLvr(loan.id, AS_OF).available).toBe(false);
  });
});
