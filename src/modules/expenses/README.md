# Module: expenses

**Responsibility** — expense records: what was spent, on what, against which
entity and property, from which source, with what evidence. Covers the second
half of FR-04 (the first half is document storage, in `documents`).

**Key rules**
- **A correction is a new version, not an overwrite.** `revisions` is
  append-only and `correct()` can only append; there is no mutation path. This
  makes "who changed what and when" answerable from the record itself, which is
  the FR-04 acceptance criterion.
- **A correction must state a reason.** Enforced in both the service and the Zod
  schema.
- **Voiding is not deleting.** A voided expense leaves totals but keeps its
  record and every revision — "deletion must not erase audit history".
- **Effective date ≠ posted date (BR-06).** A bill dated 31 August entered on
  5 September belongs to August but was only known in September. Reports run on
  `effectiveOn`; audit runs on `postedAt`.
- **Amount provenance travels with the amount (BR-06).** `actual`, `forecast`
  and `estimated` stay visibly distinct; only `actual` renders without a warning
  chip.
- **Every expense names its allocation and its source,** which is what makes
  drill-down from a report total to evidence possible (FR-09).

**Owns** — `Expense`, `ExpenseRevision`, `ExpenseAllocation`, `ExpenseSource`.

**Depends on** — `access` (actor names, audit), `entities`, `properties`,
`shared-bills` and `obligations` for source references (by id, not by import).

**Depended on by** — `dashboard` (operating result, BR-03).

**Tests** — `tests/fr-04-expenses.test.ts`.

**Not yet implemented** — creating and correcting expenses through the UI,
automatic expense creation when a bank transaction is confirmed.
