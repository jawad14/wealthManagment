/**
 * Expenses business logic (FR-04).
 *
 * Acceptance: "A reviewer can navigate from a report total to its allocated
 * expenses and original evidence; a correction records who changed what and when."
 * Both halves are structural here — `correct()` can only append, and every
 * expense carries its allocation and evidence links.
 */
import { NotFoundError, ValidationError } from '@/shared/lib/errors';
import { sumMoney, type Money } from '@/shared/lib/money';
import type { DocumentId, EntityId, IsoDate, PropertyId, UserId } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import { expensesRepository } from './repository';
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_SOURCE_LABELS,
  currentRevision,
  isIncludedInTotals,
  type Expense,
  type ExpenseCategory,
  type ExpenseRevision,
  type ExpenseView,
} from './model';

export type ExpenseFilter = 'all' | 'corrected' | 'voided' | 'no-evidence' | 'estimated';

export interface ExpenseQueryOptions {
  readonly from?: IsoDate;
  readonly to?: IsoDate;
  readonly propertyId?: PropertyId;
  readonly entityId?: EntityId;
  readonly category?: ExpenseCategory;
  /** Voided expenses are excluded unless explicitly requested. */
  readonly includeVoided?: boolean;
}

function matchesQuery(expense: Expense, options: ExpenseQueryOptions): boolean {
  if (!options.includeVoided && !isIncludedInTotals(expense)) return false;
  const current = currentRevision(expense);
  if (options.from && current.effectiveOn < options.from) return false;
  if (options.to && current.effectiveOn > options.to) return false;
  if (options.propertyId && current.allocation.propertyId !== options.propertyId) return false;
  if (options.entityId && current.allocation.entityId !== options.entityId) return false;
  if (options.category && current.category !== options.category) return false;
  return true;
}

export const expensesService = {
  view(expense: Expense): ExpenseView {
    const current = currentRevision(expense);
    return {
      expense,
      current,
      categoryLabel: EXPENSE_CATEGORY_LABELS[current.category],
      sourceLabel: EXPENSE_SOURCE_LABELS[expense.source.kind],
      versionCount: expense.revisions.length,
      isCorrected: expense.revisions.length > 1,
      isVoided: !isIncludedInTotals(expense),
      hasEvidence: expense.evidenceDocumentIds.length > 0,
    };
  },

  require(id: string): Expense {
    const expense = expensesRepository.find(id);
    if (!expense) throw new NotFoundError('Expense', id);
    return expense;
  },

  /** Expenses matching a query, newest effective date first. */
  query(options: ExpenseQueryOptions = {}): readonly ExpenseView[] {
    return expensesRepository
      .list()
      .filter((expense) => matchesQuery(expense, options))
      .map(expensesService.view)
      .sort((a, b) => b.current.effectiveOn.localeCompare(a.current.effectiveOn));
  },

  applyFilter(views: readonly ExpenseView[], filter: ExpenseFilter): readonly ExpenseView[] {
    switch (filter) {
      case 'all':
        return views.filter((view) => !view.isVoided);
      case 'corrected':
        return views.filter((view) => view.isCorrected && !view.isVoided);
      case 'voided':
        return views.filter((view) => view.isVoided);
      case 'no-evidence':
        return views.filter((view) => !view.hasEvidence && !view.isVoided);
      case 'estimated':
        return views.filter((view) => view.current.basis !== 'actual' && !view.isVoided);
    }
  },

  counts(): Record<ExpenseFilter, number> {
    const all = expensesRepository.list().map(expensesService.view);
    const count = (filter: ExpenseFilter): number => expensesService.applyFilter(all, filter).length;
    return {
      all: count('all'),
      corrected: count('corrected'),
      voided: count('voided'),
      'no-evidence': count('no-evidence'),
      estimated: count('estimated'),
    };
  },

  /**
   * Total expenses for a period. Voided records are excluded from the sum but
   * remain queryable, which is the difference between voiding and deleting.
   */
  total(options: ExpenseQueryOptions = {}): Money {
    return sumMoney(expensesService.query(options).map((view) => view.current.amount));
  },

  /** Expense total per category — the operating-result breakdown (BR-03). */
  totalsByCategory(options: ExpenseQueryOptions = {}): readonly {
    readonly category: ExpenseCategory;
    readonly label: string;
    readonly total: Money;
    readonly count: number;
  }[] {
    const grouped = new Map<ExpenseCategory, ExpenseView[]>();
    for (const view of expensesService.query(options)) {
      const existing = grouped.get(view.current.category) ?? [];
      existing.push(view);
      grouped.set(view.current.category, existing);
    }

    return [...grouped.entries()]
      .map(([category, views]) => ({
        category,
        label: EXPENSE_CATEGORY_LABELS[category],
        total: sumMoney(views.map((view) => view.current.amount)),
        count: views.length,
      }))
      .sort((a, b) => b.total.cents - a.total.cents);
  },

  /**
   * Append a correction.
   *
   * There is no update path that mutates a revision — corrections can only add,
   * so "who changed what and when" is answerable from the record itself.
   */
  correct(input: {
    readonly expenseId: string;
    readonly changes: Partial<Omit<ExpenseRevision, 'version' | 'postedAt' | 'recordedBy' | 'correctionReason'>>;
    readonly reason: string;
    readonly actor: UserId;
  }): Expense {
    const expense = expensesService.require(input.expenseId);
    if (!isIncludedInTotals(expense)) {
      throw new ValidationError('A voided expense cannot be corrected. Create a replacement instead.');
    }
    if (!input.reason.trim()) {
      throw new ValidationError('A correction must state why it was made.');
    }

    const current = currentRevision(expense);
    const next: ExpenseRevision = {
      ...current,
      ...input.changes,
      version: current.version + 1,
      postedAt: new Date().toISOString(),
      recordedBy: input.actor,
      correctionReason: input.reason,
    };

    const updated = expensesRepository.update(expense.id, { revisions: [...expense.revisions, next] });
    if (!updated) throw new NotFoundError('Expense', input.expenseId);

    accessService.record({
      actor: accessService.resolveUserName(input.actor) ?? 'system',
      summary: `Expense corrected · ${current.description}`,
      context: `v${current.version} → v${next.version} · ${input.reason}`,
    });
    return updated;
  },

  /**
   * Withdraw an expense from totals.
   * The record and every revision remain; deletion must not erase audit history.
   */
  void(expenseId: string, reason: string, actor: UserId): Expense {
    const expense = expensesService.require(expenseId);
    if (!isIncludedInTotals(expense)) {
      throw new ValidationError('This expense has already been voided.');
    }
    if (!reason.trim()) throw new ValidationError('Voiding an expense requires a reason.');

    const updated = expensesRepository.update(expense.id, {
      voidedAt: new Date().toISOString(),
      voidedBy: actor,
      voidReason: reason,
    });
    if (!updated) throw new NotFoundError('Expense', expenseId);

    accessService.record({
      actor: accessService.resolveUserName(actor) ?? 'system',
      summary: `Expense voided · ${currentRevision(expense).description}`,
      context: `${reason} · record retained`,
    });
    return updated;
  },

  /** Evidence documents backing an expense, for drill-down to source (FR-09). */
  evidenceFor(expenseId: string): readonly DocumentId[] {
    return expensesService.require(expenseId).evidenceDocumentIds;
  },
};
