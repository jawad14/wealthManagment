/**
 * Reference content for the "Mind map" screen.
 *
 * Reference data only — no aggregate, no repository, no service. Like
 * `how-it-works`, it documents behaviour owned by other modules, so every claim
 * must be checkable against the module named in the row.
 *
 * Three views of the same structure, because they answer different questions:
 *  - `ENTRY_STEPS`  — "what do I type first?"  (ordered by real prerequisites)
 *  - `CONNECTIONS`  — "what joins to what?"    (the edges, and their join key)
 *  - `MISSING_EDGES`— "why can't I record X?"  (the edges that do not exist)
 *
 * The order in `ENTRY_STEPS` is not a preference. It is what the create actions
 * actually require: a property cannot be added without an owning entity, a lease
 * cannot be added without a property, and so on.
 */
import type { IconName } from '@/shared/components/IconSprite';
import type { Tone } from '@/shared/types/common';

/* ---------------------------------------------------------------- the graph */

/**
 * Node geometry, in the SVG's 800x540 user space.
 *
 * Hand-placed rather than auto-routed. The graph is small and fixed, and a
 * layout algorithm would spend far more code to produce a worse result — the
 * one crossing edge here (Entities borrows on Loans) is routed deliberately
 * around the left margin so it reads as the separate fact that it is.
 */
export interface MapNode {
  readonly key: string;
  readonly label: string;
  readonly sub: string;
  readonly href: string | null;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  /** `spine` is the trunk; `blocked` cannot be created in the UI at all. */
  readonly tone: 'spine' | 'branch' | 'derived' | 'blocked';
}

export const NODE_HEIGHT = 48;

export const MAP_NODES: readonly MapNode[] = [
  { key: 'entities', label: 'Entities', sub: 'who owns, who borrows', href: '/entities', x: 330, y: 16, w: 140, tone: 'spine' },
  { key: 'properties', label: 'Properties', sub: 'assets and valuations', href: '/properties', x: 330, y: 126, w: 140, tone: 'spine' },
  { key: 'loans', label: 'Loans', sub: 'seed data only', href: '/loans', x: 81, y: 246, w: 140, tone: 'blocked' },
  { key: 'leases', label: 'Leases', sub: 'tenants and rent', href: '/leases', x: 247, y: 246, w: 140, tone: 'branch' },
  { key: 'bills', label: 'Shared bills', sub: 'splits and recoveries', href: '/shared-bills', x: 413, y: 246, w: 140, tone: 'branch' },
  { key: 'obligations', label: 'Obligations', sub: 'what is due', href: '/obligations', x: 579, y: 246, w: 140, tone: 'branch' },
  { key: 'documents', label: 'Documents', sub: 'evidence', href: '/documents', x: 10, y: 366, w: 120, tone: 'branch' },
  { key: 'expenses', label: 'Expenses', sub: 'the money ledger', href: '/expenses', x: 330, y: 366, w: 140, tone: 'spine' },
  { key: 'bank', label: 'Bank import', sub: 'matching', href: '/bank-import', x: 670, y: 366, w: 120, tone: 'branch' },
  { key: 'dashboard', label: 'Dashboard', sub: 'computed, never stored', href: '/dashboard', x: 330, y: 470, w: 140, tone: 'derived' },
];

/**
 * Drawn edges. `d` is an SVG path in the same user space.
 *
 * `absent` edges are the point of the diagram as much as the solid ones: they
 * mark a join a user reasonably expects and will not find.
 */
export interface MapEdge {
  readonly id: string;
  readonly d: string;
  readonly kind: 'solid' | 'absent';
  /** Optional label, placed at `labelX`/`labelY`. */
  readonly label?: string;
  readonly labelX?: number;
  readonly labelY?: number;
  readonly labelAnchor?: 'start' | 'middle';
}

export const MAP_EDGES: readonly MapEdge[] = [
  // Trunk.
  { id: 'ent-prop', d: 'M400,64 V126', kind: 'solid', label: 'owns · share %', labelX: 410, labelY: 99, labelAnchor: 'start' },
  // Entities borrows on Loans — routed around the left margin, because the
  // borrower is not the owner and the diagram should not imply otherwise.
  { id: 'ent-loan', d: 'M330,40 H40 V226 H120 V246', kind: 'solid', label: 'borrows', labelX: 50, labelY: 128, labelAnchor: 'start' },
  // Properties fans out to everything it can carry.
  { id: 'prop-bus', d: 'M400,174 V210 M190,210 H649 M190,210 V246 M317,210 V246 M483,210 V246 M649,210 V246', kind: 'solid', label: 'secures', labelX: 190, labelY: 240, labelAnchor: 'middle' },
  // Ledgers feed the expense record.
  { id: 'lease-exp', d: 'M317,294 V336 H400 V366', kind: 'solid' },
  { id: 'bill-exp', d: 'M483,294 V336 H400', kind: 'solid' },
  { id: 'obl-exp', d: 'M649,294 V336 H483', kind: 'solid' },
  { id: 'doc-exp', d: 'M130,390 H330', kind: 'solid' },
  { id: 'bank-exp', d: 'M670,390 H470', kind: 'solid' },
  { id: 'exp-dash', d: 'M400,414 V470', kind: 'solid' },
  { id: 'loan-exp', d: 'M221,294 L340,380', kind: 'solid', label: 'interest', labelX: 286, labelY: 330, labelAnchor: 'middle' },
];

/* ----------------------------------------------------------- entry sequence */

export interface EntryStep {
  readonly order: number;
  readonly title: string;
  readonly href: string | null;
  /** Fields the action rejects the form without. */
  readonly required: readonly string[];
  /** What must already exist before this step can be done at all. */
  readonly needs: string;
  /** What becomes possible once this step is done. */
  readonly unlocks: string;
  readonly note?: string;
  readonly tone: Tone;
}

export const ENTRY_STEPS: readonly EntryStep[] = [
  {
    order: 1,
    title: 'Add the entities',
    href: '/entities',
    required: ['Name', 'Kind', 'Consolidation'],
    needs: 'Nothing. This is the root of the map.',
    unlocks: 'Everything. No property can be added without an entity to own it.',
    note: 'Kind is individual, company, trust or SMSF. Set consolidation to look-through if the entity’s holdings should enter portfolio totals.',
    tone: 'gold',
  },
  {
    order: 2,
    title: 'Add the properties',
    href: '/properties',
    required: ['Name', 'Owner', 'Ownership share'],
    needs: 'At least one entity.',
    unlocks: 'Loans, leases, shared bills, obligations and per-property expense reporting.',
    note: 'The owner is mandatory and the form records the ownership link for you, at the share you enter (100% by default). A new property is deliberately flagged as an ownership gap until a consolidation method is chosen.',
    tone: 'gold',
  },
  {
    order: 3,
    title: 'Value each property',
    href: '/properties',
    required: ['Amount', 'Valuation date', 'Basis', 'Confidence'],
    needs: 'The property. Add the valuation from its detail page.',
    unlocks: 'Every LVR and gearing ratio. Without a valuation they all read "Unavailable".',
    note: 'Valuations stack up rather than replace each other, and they go stale — an old one stops being eligible, and the ratio reverts to Unavailable.',
    tone: 'gold',
  },
  {
    order: 4,
    title: 'Add the loans',
    href: null,
    required: [],
    needs: 'The borrowing entity and the securing property.',
    unlocks: 'Debt totals, LVR and the interest figures on the loans screen.',
    note: 'There is no form for this. The loans module has no write actions at all, so every facility on the screen is seed data. This is the one break in the chain — see How it works for what else is missing on a loan.',
    tone: 'bad',
  },
  {
    order: 5,
    title: 'Add the leases',
    href: '/leases',
    required: ['Property', 'Billing reference', 'Start', 'End', 'Rent', 'Frequency', 'Tenant'],
    needs: 'The property. A tenant is created inline if they are new.',
    unlocks: 'Rent charges, receipts and arrears — all computed, never typed.',
    note: 'Rent frequency is weekly, fortnightly or monthly, and the schedule is walked from the anchor date rather than approximated.',
    tone: 'info',
  },
  {
    order: 6,
    title: 'Register the documents',
    href: '/documents',
    required: ['Title', 'Kind', 'Link'],
    needs: 'The record the document evidences.',
    unlocks: 'Evidence on expenses, and the ability to close an obligation.',
    note: 'Register a statement or invoice once and link it to several records rather than uploading it repeatedly.',
    tone: 'info',
  },
  {
    order: 7,
    title: 'Record the obligations',
    href: '/obligations',
    required: ['Title', 'Due date'],
    needs: 'Nothing, though a property and an owner make it far more useful.',
    unlocks: 'Reminders, and the overdue counts in the sidebar.',
    note: 'Status is derived from the due date and the payment. Only payment evidence closes an obligation — sending a reminder never does.',
    tone: 'info',
  },
  {
    order: 8,
    title: 'Enter the expenses',
    href: '/expenses',
    required: ['Description', 'Amount', 'Effective date', 'Entity'],
    needs: 'The entity. Property, evidence and basis are optional but worth filling.',
    unlocks: 'Cost reporting, drill-down and the cash-flow figures.',
    note: 'This is where loan interest goes — category "Loan interest", the interest portion only, never the whole repayment, with the Loan field set so the cost ties to its facility. Effective date is the period the cost belongs to, which may not be the day it was debited.',
    tone: 'gold',
  },
  {
    order: 9,
    title: 'Record the shared bills',
    href: '/shared-bills',
    required: ['Property', 'Supplier', 'Total', 'Period from', 'Period to', 'Due date'],
    needs: 'The property, and the leases the cost is recovered against.',
    unlocks: 'The split between what you recover and what you bear.',
    note: 'Only the owner share is your expense. The recoverable share is money you expect back, and the split is allocated to the cent.',
    tone: 'info',
  },
  {
    order: 10,
    title: 'Import and match the bank feed',
    href: '/bank-import',
    required: ['A statement to import'],
    needs: 'The records the transactions should match against.',
    unlocks: 'Posted cash flow, and confirmation that entered figures match the bank.',
    note: 'Staged transactions are held apart from posted cash flow, so an import in progress can never move a historical figure. Internal transfers and loan drawdowns are excluded on purpose.',
    tone: 'info',
  },
  {
    order: 11,
    title: 'Read the dashboard',
    href: '/dashboard',
    required: [],
    needs: 'Everything above.',
    unlocks: 'Net worth, liabilities, per-entity position and the drill-down behind each.',
    note: 'Nothing here is stored. Every figure is computed on read from the records you entered, which is why each one can be explained back to its evidence.',
    tone: 'good',
  },
];

/* ---------------------------------------------------------------- the joins */

export interface Connection {
  readonly from: string;
  readonly relation: string;
  readonly to: string;
  /** What actually holds the two together in the data. */
  readonly joinedBy: string;
  readonly icon: IconName;
}

export const CONNECTIONS: readonly Connection[] = [
  { from: 'Entity', relation: 'owns', to: 'Property', joinedBy: 'An ownership relationship carrying a share percentage. This is the only link that confers a claim on an asset.', icon: 'i-link' },
  { from: 'Entity', relation: 'controls', to: 'Entity or Property', joinedBy: 'A director, trustee, beneficiary or member relationship — deliberately carrying no percentage, so control can never double-count an asset.', icon: 'i-shield' },
  { from: 'Entity', relation: 'borrows on', to: 'Loan', joinedBy: 'The borrower list on the facility. Separate from ownership, so a company can borrow against a personally-held property.', icon: 'i-wallet' },
  { from: 'Property', relation: 'secures', to: 'Loan', joinedBy: 'The facility’s security — one property, a pool of several, or unsecured. A pool needs an approved allocation policy before any per-property ratio can be published.', icon: 'i-building' },
  { from: 'Property', relation: 'is valued by', to: 'Valuation', joinedBy: 'Dated valuations that accumulate. The newest eligible one is the denominator of every ratio; too old, and the ratio reverts to Unavailable.', icon: 'i-up' },
  { from: 'Property', relation: 'is let under', to: 'Lease', joinedBy: 'The lease names the property, and optionally a component of it — which is how a per-room letting is modelled.', icon: 'i-users' },
  { from: 'Lease', relation: 'generates', to: 'Rent charges', joinedBy: 'A schedule walked from the anchor date. Arrears are charges less allocations, computed on read — never a stored number.', icon: 'i-clock' },
  { from: 'Shared bill', relation: 'splits into', to: 'Recovery + owner expense', joinedBy: 'An allocation agreement. Leftover cents are handed out so the parts sum to the total exactly.', icon: 'i-calc' },
  { from: 'Expense', relation: 'is charged to', to: 'Entity, and optionally a Property, Lease, Obligation or Loan', joinedBy: 'The expense allocation. The entity is required; the rest are what make drill-down and per-property reporting work. The loan is what ties interest to its facility so the two figures can be reconciled.', icon: 'i-file' },
  { from: 'Document', relation: 'evidences', to: 'Any record', joinedBy: 'A document link. One registered document can back an expense, a loan and an obligation at once.', icon: 'i-check-sq' },
  { from: 'Obligation', relation: 'is closed by', to: 'Payment + evidence', joinedBy: 'A recorded payment with a document. A sent reminder changes nothing about its status.', icon: 'i-bell' },
  { from: 'Everything', relation: 'rolls up into', to: 'Dashboard', joinedBy: 'Consolidation at each entity’s ownership share. Nothing is stored, so no figure can drift from the records behind it.', icon: 'i-home' },
];

/* ------------------------------------------------------------ absent joins */

export interface MissingEdge {
  readonly between: string;
  readonly consequence: string;
  readonly workaround: string;
}

/** The edges a user expects to find and will not. Each is verified absent. */
export const MISSING_EDGES: readonly MissingEdge[] = [
  {
    between: 'Loan → what the money bought',
    consequence:
      'There is no record of what borrowed funds were used for, so a deposit funded by refinancing another property cannot be linked to the property it bought. Loan drawdowns are also excluded from cash flow, so the movement is invisible there too.',
    workaround:
      'None within the app. The link can only be kept in a note or a document. This matters because deductibility follows the use of the funds, not the security.',
  },
  {
    between: 'Pooled loan interest → each property',
    consequence:
      'Interest on a cross-collateralised facility is not apportioned across the properties securing it. The allocation policy governs LVR only.',
    workaround:
      'Split the interest yourself into one expense per property. Nothing checks that your split matches the allocation policy.',
  },
];
