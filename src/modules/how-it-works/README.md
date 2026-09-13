# Module: how-it-works

**Responsibility** — the tester-facing guide at `/how-it-works`: where each fact
is recorded, the rules the figures obey, scripted walkthroughs, and the gaps
that are not defects.

**Reference data only.** Like `design-system`, this module owns no aggregate and
has no repository, service or actions. It documents behaviour that lives in
other modules.

**Key rules**
- **Every claim must be checkable against the module it describes.** Each
  routing row names its screen; each gap row was verified against the code, not
  inferred from the UI. A guide that drifts from the app is worse than none.
- **`KNOWN_GAPS` is the load-bearing section.** It is what stops a tester
  raising absent-by-design behaviour, and it distinguishes *not built* from
  *out of scope* — those have different answers.
- **`ALWAYS_RAISE` is its counterweight.** Listing what is not a defect without
  listing what is would teach testers to report nothing.
- **Rendered as one server-side page, with no tabs or accordions.** Ctrl+F only
  finds what is in the DOM, and searching the whole guide at once is the point.

**Owns** — `RoutingRow`, `RuleCard`, `Walkthrough`, `GapRow` (content types).

**Depends on** — `shared/components` only.

**Depended on by** — nothing.

**When you change another module, check this one.** Wiring up loan CRUD, the
ownership-relationship form, expense corrections or a `loanId` on
`ExpenseAllocation` each retires a row in `KNOWN_GAPS`.
