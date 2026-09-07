/**
 * Navigation model — the single source of truth for the sidebar, the mobile tab
 * bar and page titles. Adding a feature screen means adding one entry here.
 */
import type { IconName } from '@/shared/components/IconSprite';

/** Stable key for a screen. Matches the module directory name where one exists. */
export type ViewKey =
  | 'dashboard'
  | 'obligations'
  | 'bank-import'
  | 'shared-bills'
  | 'expenses'
  | 'loans'
  | 'properties'
  | 'leases'
  | 'entities'
  | 'documents'
  | 'access'
  | 'design-system';

export interface NavItem {
  readonly key: ViewKey;
  readonly href: string;
  readonly label: string;
  readonly icon: IconName;
  /** Sidebar group heading this item sits under. */
  readonly group: NavGroup;
  /**
   * Key of the count badge to display, resolved at render time from live data.
   * Undefined means the item never shows a badge.
   */
  readonly badge?: 'openObligations' | 'unmatchedTransactions' | 'billsNeedingReview';
}

export type NavGroup = 'Overview' | 'Money' | 'Property' | 'Records' | 'Admin';

export const NAV_GROUPS: readonly NavGroup[] = ['Overview', 'Money', 'Property', 'Records', 'Admin'];

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: 'i-home', group: 'Overview' },
  { key: 'obligations', href: '/obligations', label: 'Obligations & reminders', icon: 'i-check-sq', group: 'Overview', badge: 'openObligations' },
  { key: 'bank-import', href: '/bank-import', label: 'Bank import & matching', icon: 'i-wallet', group: 'Money', badge: 'unmatchedTransactions' },
  { key: 'shared-bills', href: '/shared-bills', label: 'Shared bills & recoveries', icon: 'i-users', group: 'Money', badge: 'billsNeedingReview' },
  { key: 'expenses', href: '/expenses', label: 'Expenses', icon: 'i-file', group: 'Money' },
  { key: 'loans', href: '/loans', label: 'Loans & liabilities', icon: 'i-calc', group: 'Money' },
  { key: 'properties', href: '/properties', label: 'Properties & assets', icon: 'i-building', group: 'Property' },
  { key: 'leases', href: '/leases', label: 'Leases & tenants', icon: 'i-users', group: 'Property' },
  { key: 'entities', href: '/entities', label: 'Entities & ownership', icon: 'i-link', group: 'Records' },
  { key: 'documents', href: '/documents', label: 'Documents', icon: 'i-file', group: 'Records' },
  { key: 'access', href: '/access', label: 'Access & audit', icon: 'i-shield', group: 'Admin' },
  { key: 'design-system', href: '/design-system', label: 'Design system', icon: 'i-palette', group: 'Admin' },
];

/** Page titles shown in the top bar, keyed by view. */
export const VIEW_TITLES: Record<ViewKey, string> = {
  dashboard: 'Dashboard',
  obligations: 'Obligations & reminders',
  'bank-import': 'Bank import & matching',
  'shared-bills': 'Shared bills & recoveries',
  expenses: 'Expenses',
  loans: 'Loans & liabilities',
  properties: 'Properties & assets',
  leases: 'Leases & tenants',
  entities: 'Entities & ownership',
  documents: 'Documents',
  access: 'Access & audit',
  'design-system': 'Design system',
};

/** The five bottom-bar destinations on mobile. `menu` opens the drawer. */
export type TabKey = 'dashboard' | 'bank-import' | 'properties' | 'obligations' | 'menu';

export interface TabItem {
  readonly key: TabKey;
  readonly href: string | null;
  readonly label: string;
  readonly icon: IconName;
}

export const TAB_ITEMS: readonly TabItem[] = [
  { key: 'dashboard', href: '/dashboard', label: 'Home', icon: 'i-home' },
  { key: 'bank-import', href: '/bank-import', label: 'Money', icon: 'i-wallet' },
  { key: 'properties', href: '/properties', label: 'Property', icon: 'i-building' },
  { key: 'obligations', href: '/obligations', label: 'Tasks', icon: 'i-check-sq' },
  { key: 'menu', href: null, label: 'More', icon: 'i-grid' },
];

/**
 * Which bottom tab is highlighted for a given view. Screens without a tab of
 * their own light up "More", matching the prototype's `tabMap`.
 */
export const TAB_FOR_VIEW: Record<ViewKey, TabKey> = {
  dashboard: 'dashboard',
  'bank-import': 'bank-import',
  'shared-bills': 'bank-import',
  expenses: 'bank-import',
  loans: 'bank-import',
  properties: 'properties',
  leases: 'properties',
  obligations: 'obligations',
  entities: 'menu',
  documents: 'menu',
  access: 'menu',
  'design-system': 'menu',
};

/** Resolve the active view from a pathname. Defaults to the dashboard. */
export function viewFromPathname(pathname: string): ViewKey {
  const match = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.key ?? 'dashboard';
}
