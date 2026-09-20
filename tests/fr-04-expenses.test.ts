/**
 * FR-04 — expense records.
 *
 * Acceptance: "A reviewer can navigate from a report total to its allocated
 * expenses and original evidence; a correction records who changed what and when."
 * Plus: "deletion must not erase audit history."
 */
import { describe, expect, it, vi } from 'vitest';

// The action calls revalidatePath, which needs a request scope a unit test lacks.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { correctExpenseAction } from '@/modules/expenses/actions';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';
import { expensesService } from '@/modules/expenses/service';
import { currentRevision } from '@/modules/expenses/model';
import { USER_IDS } from '@/modules/access/data/seed';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import { fromMajorUnits } from '@/shared/lib/money';
import { ValidationError } from '@/shared/lib/errors';

describe('FR-04 · expense records', () => {
  it('keeps every version of a corrected expense', () => {
    const expense = expensesService.require('exp-water-aug');

    expect(expense.revisions).toHaveLength(2);
    expect(expense.revisions[0]?.amount.cents).toBe(fromMajorUnits(206).cents);
    expect(expense.revisions[1]?.amount.cents).toBe(fromMajorUnits(247.2).cents);
    // The current value is the latest revision, not the first.
    expect(currentRevision(expense).amount.cents).toBe(fromMajorUnits(247.2).cents);
  });

  it('records who corrected an expense, when, and why', () => {
    const latest = currentRevision(expensesService.require('exp-water-aug'));

    expect(latest.correctionReason).toBe('Split changed 50/50 → 60/40 per signed agreement');
    expect(latest.recordedBy).toBe(USER_IDS.mahvish);
    expect(latest.postedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('separates the period a cost belongs to from when it was entered (BR-06)', () => {
    const latest = currentRevision(expensesService.require('exp-water-aug'));

    // Effective in August; only corrected in September.
    expect(latest.effectiveOn).toBe('2026-08-31');
    expect(latest.postedAt.slice(0, 10)).toBe('2026-09-05');
  });

  it('excludes voided expenses from totals but keeps them readable', () => {
    const voided = expensesService.require('exp-repairs-misfiled');
    expect(voided.voidedAt).toBeDefined();
    expect(voided.voidReason).toContain('Property could not be determined');
    expect(voided.revisions).toHaveLength(1);

    const included = expensesService.query();
    expect(included.map((view) => view.expense.id)).not.toContain('exp-repairs-misfiled');

    const withVoided = expensesService.query({ includeVoided: true });
    expect(withVoided.map((view) => view.expense.id)).toContain('exp-repairs-misfiled');
  });

  it('refuses a correction without a reason', () => {
    expect(() =>
      expensesService.correct({
        expenseId: 'exp-insurance-benton',
        changes: { amount: fromMajorUnits(1_800) },
        reason: '   ',
        actor: USER_IDS.jawad,
      }),
    ).toThrow(ValidationError);
  });

  it('refuses to correct a voided expense', () => {
    expect(() =>
      expensesService.correct({
        expenseId: 'exp-repairs-misfiled',
        changes: { amount: fromMajorUnits(1) },
        reason: 'attempt',
        actor: USER_IDS.jawad,
      }),
    ).toThrow(ValidationError);
  });

  it('appends v2 when a correction is submitted from the form, leaving v1 intact', async () => {
    const before = expensesService.require('exp-insurance-benton');
    expect(before.revisions).toHaveLength(1);
    const original = before.revisions[0];

    // Field values exactly as the "Correct expense" form submits them.
    const form = new FormData();
    form.append('expenseId', 'exp-insurance-benton');
    form.append('reason', 'Invoice amount updated after credit');
    form.append('amount', '$1,650.50');
    form.append('category', 'insurance');
    form.append('description', 'Landlord insurance renewal · credit applied');
    form.append('effectiveOn', '2026-08-01');

    const result = await correctExpenseAction(IDLE_RESULT as ActionResult<unknown>, form);
    expect(result.ok).toBe(true);

    const view = expensesService.view(expensesService.require('exp-insurance-benton'));
    expect(view.versionCount).toBe(2);
    expect(view.isCorrected).toBe(true);
    expect(view.current.version).toBe(2);
    expect(view.current.amount.cents).toBe(fromMajorUnits(1_650.5).cents);
    expect(view.current.description).toBe('Landlord insurance renewal · credit applied');
    expect(view.current.correctionReason).toBe('Invoice amount updated after credit');
    // The allocation was not on the form, so it carries over unchanged.
    expect(view.current.allocation).toEqual(original?.allocation);

    // v1 is still in the timeline exactly as it was entered.
    expect(view.expense.revisions[0]).toEqual(original);
    expect(view.expense.revisions[0]?.amount.cents).toBe(fromMajorUnits(1_710).cents);
    expect(view.expense.revisions[0]?.recordedBy).toBe(USER_IDS.jawad);
  });

  it('rejects a form correction with no reason and adds no version', async () => {
    const versions = expensesService.require('exp-management-benton').revisions.length;

    const form = new FormData();
    form.append('expenseId', 'exp-management-benton');
    form.append('reason', '');
    form.append('amount', '10.00');

    const result = await correctExpenseAction(IDLE_RESULT as ActionResult<unknown>, form);
    expect(result.ok).toBe(false);
    expect(expensesService.require('exp-management-benton').revisions).toHaveLength(versions);
  });

  it('lets a reviewer drill from a total to its allocated expenses', () => {
    const bentonTotal = expensesService.total({ propertyId: PROPERTY_IDS.bentonSt });
    const bentonRows = expensesService.query({ propertyId: PROPERTY_IDS.bentonSt });

    // The total is exactly the sum of the rows behind it.
    const summed = bentonRows.reduce((sum, view) => sum + view.current.amount.cents, 0);
    expect(bentonTotal.cents).toBe(summed);
    expect(bentonRows.length).toBeGreaterThan(0);
  });

  it('reaches original evidence from an expense', () => {
    expect(expensesService.evidenceFor('exp-water-aug')).toEqual(['doc-urban-utilities']);
  });

  it('breaks totals down by category without losing a cent', () => {
    const byCategory = expensesService.totalsByCategory();
    const grandTotal = expensesService.total();
    const summed = byCategory.reduce((sum, row) => sum + row.total.cents, 0);
    expect(summed).toBe(grandTotal.cents);
  });
});
