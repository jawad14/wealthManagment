/**
 * Reference content for the "How it works" screen (NFR-07 — explainability).
 *
 * Reference data only, like `design-system/tokens.ts`: no aggregates, no
 * repository, no service. It documents behaviour that already exists elsewhere
 * in the codebase, so every claim here must be checkable against the module it
 * describes. The `where` field on each row names that module.
 *
 * Written for a tester. The most load-bearing section is `KNOWN_GAPS` — the
 * behaviour that looks like a defect and is not, so time is not spent raising it.
 */
import type { IconName } from '@/shared/components/IconSprite';
import type { Tone } from '@/shared/types/common';

/* ------------------------------------------------------------------ routing */

/** One "I need to record X — where does it go?" answer. */
export interface RoutingRow {
  readonly what: string;
  readonly screen: string;
  readonly href: string;
  readonly why: string;
}

/**
 * The routing table. Mirrors `docs/MODULE_MAP.md` §"Who owns which concept",
 * phrased as a task rather than a concept.
 */
export const ROUTING: readonly RoutingRow[] = [
  {
    what: 'Who owns a property — a person, company, trust or SMSF',
    screen: 'Entities & ownership',
    href: '/entities',
    why: 'An ownership link carries a share percentage. Consolidation reads that share, so this is what makes a property count once, at the right proportion.',
  },
  {
    what: 'A director, trustee, beneficiary or member link',
    screen: 'Entities & ownership',
    href: '/entities',
    why: 'Recorded as a control relationship, which carries no percentage. Control must never confer a claim on an asset, or the same property would be counted twice (BR-02).',
  },
  {
    what: 'Who borrows on a facility',
    screen: 'Loans & liabilities',
    href: '/loans',
    why: 'The borrower is stored on the loan, separately from who owns the property. A company can borrow against a property held in a personal name, and both facts stay true.',
  },
  {
    what: 'Interest you actually paid',
    screen: 'Expenses',
    href: '/expenses',
    why: 'Category "Loan interest", allocated to an entity and a property. Expenses is the ledger — it is what reporting, drill-down and the cash-flow figures read.',
  },
  {
    what: "A facility's headline monthly interest",
    screen: 'Loans & liabilities',
    href: '/loans',
    why: 'Held on the loan as part of the repayment split, copied from the lender statement. It is a snapshot for the loans KPIs, not a ledger — it does not accumulate.',
  },
  {
    what: 'What a property is worth',
    screen: 'Properties & assets',
    href: '/properties',
    why: 'Valuations are dated and stack up over time. The newest eligible one is the denominator of every LVR, and its age decides whether a ratio may be published at all.',
  },
  {
    what: 'Rent owed and rent received',
    screen: 'Leases & tenants',
    href: '/leases',
    why: 'Rent charges come from the lease schedule; arrears are computed from what was charged against what was allocated. Arrears are never typed in by hand.',
  },
  {
    what: 'A cost shared with a tenant or co-owner',
    screen: 'Shared bills & recoveries',
    href: '/shared-bills',
    why: 'Splits the bill into a recoverable share and an owner share. Only the owner share is your expense — the rest is money you expect back.',
  },
  {
    what: 'Something that must be paid by a date',
    screen: 'Obligations & reminders',
    href: '/obligations',
    why: 'Status is derived from the due date and the payment, so an obligation cannot be quietly marked done. Payment evidence closes it; a sent reminder does not.',
  },
  {
    what: 'The invoice, statement or policy PDF',
    screen: 'Documents',
    href: '/documents',
    why: 'Registered once and linked to the record it evidences, so the same statement can back an expense and a loan without being uploaded twice.',
  },
];

/* -------------------------------------------------------------------- rules */

/** A rule the figures obey, paired with what it looks like on screen. */
export interface RuleCard {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  /** What a tester should be able to observe if the rule is working. */
  readonly observe: string;
  readonly icon: IconName;
}

export const RULES: readonly RuleCard[] = [
  {
    id: 'BR-04',
    title: 'Unavailable beats zero',
    body: 'A ratio with no denominator is not 0% — it is unknown. When a valuation is missing or too old to rely on, the LVR renders as "Unavailable · valuation missing" or "Unavailable · valuation stale".',
    observe: 'A blank or stale valuation never produces a flattering 0%. If you ever see 0% where there is no valuation, that is a real defect.',
    icon: 'i-alert',
  },
  {
    id: 'BR-04',
    title: 'A pooled facility needs an approved policy',
    body: 'A loan secured over several properties has no per-property LVR until an allocation policy is approved. An unapproved policy may inform a working figure on a property card, but must not drive a published ratio.',
    observe: 'CBA 8820 is seeded with a deliberately unapproved 50/50 policy. Its per-property LVR should read "Pool only · allocation policy needed".',
    icon: 'i-link',
  },
  {
    id: 'FR-11',
    title: 'Money lent out is an asset',
    body: 'A facility has a direction. A receivable is money owed to the portfolio: it is never added to debt, and repayments on it are never an expense.',
    observe: 'The $120,000 personal loan to M. Devlin appears as an asset. It must not appear in total liabilities or in any expense total.',
    icon: 'i-wallet',
  },
  {
    id: 'BR-01',
    title: 'A shared loan counts once',
    body: 'A facility secured over two properties is one debt. Consolidation counts the balance a single time no matter how many properties or entities it touches.',
    observe: 'Total liabilities on the dashboard equals the sum of the distinct facilities — not the sum of per-property attributions.',
    icon: 'i-calc',
  },
  {
    id: 'FR-04',
    title: 'Corrections append, they never overwrite',
    body: 'Correcting an expense adds a new version and keeps the old one. Voiding removes the amount from totals but leaves the record and its whole history readable. Documents are hidden, never deleted.',
    observe: 'After a correction the version count rises and the earlier figure is still retrievable. Nothing you do through the UI should make a record vanish.',
    icon: 'i-file',
  },
  {
    id: 'FR-09',
    title: 'Derived state is never stored',
    body: 'Obligation status, lease status, arrears and bill splits are computed each time they are read, from the records and the as-of date. None of them is saved.',
    observe: 'Every figure can be traced back to the records behind it. A total that cannot be explained by the rows on the same screen is a defect.',
    icon: 'i-clock',
  },
  {
    id: 'BR-06',
    title: 'Splits balance to the cent',
    body: 'Money is held as whole cents and split with a largest-remainder rule, which hands the leftover cents out rather than rounding each part on its own.',
    observe: 'A 60/40 split of an odd amount still sums back to the original exactly. The parts should never be a cent short or a cent over.',
    icon: 'i-check',
  },
  {
    id: 'NFR-01',
    title: 'Permissions are enforced on the server',
    body: 'Access is checked where the data is served, not in the screen. The same rule therefore covers exports, search results, document links and direct URLs.',
    observe: 'A delegate who cannot see portfolio totals also cannot reach them by typing the URL, running an export or opening a linked document.',
    icon: 'i-shield',
  },
];

/* -------------------------------------------------------------- walkthroughs */

export interface Walkthrough {
  readonly id: string;
  readonly title: string;
  /** Why a tester would run this — the question it answers. */
  readonly purpose: string;
  readonly steps: readonly string[];
  readonly expected: string;
}

export const WALKTHROUGHS: readonly Walkthrough[] = [
  {
    id: 'company-owned',
    title: 'Record a property owned by a company',
    purpose: 'Confirms that ownership, control and borrowing are three different facts and do not contaminate each other.',
    steps: [
      'Go to Entities & ownership and add the company: Name, Kind "Company", a Descriptor such as "Company · ACN 6xx xxx xxx", and Consolidation "look-through" so its holdings enter portfolio totals.',
      'Add the individual director as a second entity of Kind "Individual".',
      'Go to Properties & assets and add the property. The form requires an Owner — pick the company — and an ownership share, which defaults to 100%. Adding the property records the ownership link for you.',
      'Open the property and add a valuation, so it has a denominator for later ratio checks.',
    ],
    expected:
      'The company appears with a look-through chip, and the property is listed showing "Company name · 100%". The new property is deliberately flagged as an ownership gap until a consolidation method is chosen for it — that is by design, not a defect.',
  },
  {
    id: 'interest',
    title: 'Record the interest you paid',
    purpose: 'This is the answer to "where does interest go?" — it goes in the ledger, not on the loan.',
    steps: [
      'Go to Expenses and open the new-expense form.',
      'Description: name the facility, e.g. "Interest · Macquarie 4417".',
      'Amount: the interest portion of the repayment, not the whole repayment. The principal portion is not an expense.',
      'Category: "Loan interest".',
      'Effective date: the period the interest belongs to, which may differ from the day it was debited.',
      'Entity: the borrowing entity. Property: the property the interest is attributable to.',
      'Loan: pick the facility. This ties the cost to the loan, so booked interest can be reconciled against the facility’s own repayment split — always set it on interest and loan fees.',
      'Amount basis: "actual" when it comes from a statement; "estimated" if you are keying an expected figure.',
      'Attach the lender statement as evidence.',
    ],
    expected:
      'The expense appears under the Loan interest category, flows into the property and entity totals, and names its facility in the detail panel. It does not rewrite the figure on the Loans screen — that stays the lender’s stated split — but the two can now be compared, and a test asserts they agree.',
  },
  {
    id: 'unavailable',
    title: 'See why a ratio is unavailable',
    purpose: 'Checks BR-04 end to end, and teaches the difference between "unknown" and "zero".',
    steps: [
      'Open Loans & liabilities and find a facility whose LVR does not show a percentage.',
      'Read the reason next to it — missing valuation, stale valuation, or a pool without an approved policy.',
      'For a stale or missing valuation, open the securing property and add a current valuation.',
      'Return to Loans and re-check the facility.',
    ],
    expected:
      'Supplying an eligible valuation turns the ratio into a number. A pooled facility stays unavailable regardless of valuations until its allocation policy is approved — that is correct, not a bug.',
  },
  {
    id: 'correction',
    title: 'Prove a correction keeps its history',
    purpose: 'Checks FR-04. The point of the test is that nothing disappears.',
    steps: [
      'Go to Expenses and pick any expense.',
      'Void it, giving a reason. Voiding is the correction path that is currently wired to the UI.',
      'Confirm the expense is excluded from the totals.',
      'Confirm the record itself is still listed and still readable, with its reason attached.',
    ],
    expected:
      'The amount leaves the totals; the record, its revisions and the reason all remain. If a voided record vanishes from the list entirely, that is a defect.',
  },
  {
    id: 'receivable',
    title: 'Prove a receivable is not debt',
    purpose: 'Checks FR-11, the rule most likely to be broken by a well-meaning change elsewhere.',
    steps: [
      'Open Loans & liabilities and locate the personal loan to M. Devlin, seeded at $120,000.',
      'Note the total debt and the facility count shown on the same screen.',
      'Open the Dashboard and compare total liabilities.',
    ],
    expected:
      'The $120,000 is counted as an asset and is absent from both total debt and the facility count. Seeing it inside a liabilities figure is a real defect.',
  },
];

/* ---------------------------------------------------------------- known gaps */

/** Behaviour that is absent by design or not yet built — not a defect. */
export interface GapRow {
  readonly area: string;
  readonly gap: string;
  readonly status: string;
  readonly tone: Tone;
}

/**
 * Each row was verified against the code, not inferred from the screens.
 * `status` says why it is absent, which is what decides whether it is worth
 * raising at all.
 */
export const KNOWN_GAPS: readonly GapRow[] = [
  {
    area: 'Loans',
    gap: 'There is no form to create or edit a loan anywhere in the app.',
    status: 'Not built — the loans module has no write actions at all. Every facility on the screen is seed data.',
    tone: 'bad',
  },
  {
    area: 'Loans',
    gap: 'A loan has no start date, term, original amount, credit limit, offset balance or account number.',
    status: 'Out of scope — FR-03 asks for lender, borrower, balance as-of date, rate, repayment type, scheduled amount, review date and securities. These fields are not in the requirement.',
    tone: 'warn',
  },
  {
    area: 'Loans',
    gap: 'Repayments are monthly only. There is no weekly or fortnightly option.',
    status: 'Not built — the repayment amount is defined as a monthly figure. Leases already model weekly/fortnightly/monthly, so the pattern to copy exists.',
    tone: 'warn',
  },
  {
    area: 'Loans',
    gap: 'There is no way to record what borrowed money was used for — so a deposit funded by refinancing another property cannot be linked to the property it bought.',
    status: 'Not modelled — the loan records which properties secure it, which is collateral, not use of funds. Loan drawdowns are also deliberately excluded from cash flow, so the drawdown is not visible as a transaction either.',
    tone: 'bad',
  },
  {
    area: 'Loans',
    gap: 'Interest on a cross-collateralised facility is not apportioned across the properties securing it.',
    status: 'Not built — the allocation policy governs LVR only. Nothing applies it to interest, so the whole amount lands wherever the expense is allocated by hand.',
    tone: 'warn',
  },
  {
    area: 'Entities',
    gap: 'A second owner, a changed share, or a director/trustee link cannot be added through the screen.',
    status: 'Partly built — the first ownership link is created with the property, which is the only path wired to the UI. The standalone relationship action exists, validates BR-02 and is covered by tests, but has no form, so co-ownership and control links come from the seed.',
    tone: 'warn',
  },
  {
    area: 'Expenses',
    gap: 'An expense can be voided but not amended in place.',
    status: 'Partly built — the correction action exists and versions correctly; only voiding is reachable from the UI.',
    tone: 'warn',
  },
  {
    area: 'Obligations',
    gap: 'A recurring obligation does not generate its future instances.',
    status: 'Not built — recurrence is recorded on the obligation but is not yet expanded into a schedule.',
    tone: 'warn',
  },
];

/** The contrast to `KNOWN_GAPS` — symptoms that always deserve a report. */
export const ALWAYS_RAISE: readonly string[] = [
  'A ratio showing 0% where no valuation exists, instead of "Unavailable".',
  'A figure that changes when no underlying record changed.',
  'A property, loan or entity counted twice in a portfolio total.',
  'A record that disappears entirely after being voided, corrected or removed.',
  'A total that cannot be reconciled with the rows shown on the same screen.',
  'Any figure reachable by URL, export or search that the screen itself hides from you.',
];
