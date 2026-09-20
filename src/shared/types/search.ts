/**
 * Global search wire types (FR-09).
 *
 * These live in the shared kernel because both sides of the wire need them: the
 * `search` module produces them and the top bar renders them, and `shared/` may
 * not import from a feature module.
 */

export type SearchCategory = 'properties' | 'tenants' | 'obligations' | 'loans' | 'documents';

/** Display order of the groups in the results menu. */
export const SEARCH_CATEGORIES: readonly SearchCategory[] = [
  'properties',
  'tenants',
  'obligations',
  'loans',
  'documents',
];

export const SEARCH_CATEGORY_LABELS: Record<SearchCategory, string> = {
  properties: 'Properties',
  tenants: 'Tenants',
  obligations: 'Obligations',
  loans: 'Loans',
  documents: 'Documents',
};

export interface SearchResult {
  /** Unique within its category. */
  readonly id: string;
  readonly category: SearchCategory;
  readonly title: string;
  /** Secondary line that tells two similarly-named results apart. */
  readonly subtitle: string;
  /** Where choosing the result navigates to. */
  readonly href: string;
}

export interface SearchGroup {
  readonly category: SearchCategory;
  readonly label: string;
  /** Capped at the per-category limit. */
  readonly results: readonly SearchResult[];
  /** Matches before the cap, so the menu can say "5 of 12". */
  readonly total: number;
}

export interface SearchResults {
  readonly query: string;
  /** Only categories with at least one match, in display order. */
  readonly groups: readonly SearchGroup[];
}
