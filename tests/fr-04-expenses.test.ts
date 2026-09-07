/**
 * FR-04 — expense records.
 *
 * Acceptance: "A reviewer can navigate from a report total to its allocated
 * expenses and original evidence; a correction records who changed what and when."
 * Plus: "deletion must not erase audit history."
 */
import { describe, expect, it } from 'vitest';
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
