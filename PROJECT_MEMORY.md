# Project memory

Running record for future sessions. Read this first; it should let you resume
without re-deriving anything.

**Last updated:** 2026-09-08 (session 3 — demonstration dataset)
**Build status:** 110 tests ✅ · typecheck ✅ · lint ✅ · build ✅ · 21 routes live

---

## 1. Where things stand

A Next.js 15 + TypeScript implementation of the Holdfast platform, built against
two sources of truth: `design/wealth-platform-design.html` for design and
`Wealth_Platform_Requirements_Analysis.docx` for functionality.

**Session 1** built the app from the design alone, inferring requirements from
the FR/BR/NFR identifiers the design cites.
**Session 2** received the requirements document and closed the gaps it exposed.

Eleven feature modules, thirteen screens, twenty-one routes, 110 tests.

## 2. What the requirements document changed

This is the most important section for a future session — it records where
inference went wrong.

| Inferred in session 1 | Actually | Consequence |
| --- | --- | --- |
| FR-07 = *unknown* | **"Shared bills and recoveries"** — an MVP requirement | A whole module was missing. Built in session 2. |
| FR-10 = *unknown* | "Assisted statement analysis" (Release 2) | Correctly out of scope |
| FR-11 = "receivable is an asset" | "Budgeting, lending and scenarios" (Release 2); the receivable rule is one acceptance criterion inside it | The rule was right; the scope was much larger |
| FR-12 = did not exist | "Extended portfolio and family modules" (Later) | Out of scope |
| BR-01…BR-05 | Correct | — |
| **BR-06 did not exist** | Money/date discipline rule | Rounding, effective vs posting dates, amount provenance all added |
| NFR-01/03/07 | Correct, but NFR-02/04/05/06/08 also exist | Mostly deployment concerns; documented as not started |

**Lesson for next time:** the design's FR references were reliable for *which*
requirements exist but not for *what they say*. Two of eleven were misread.

## 3. Key decisions, and why

### 3.1 CSS ported verbatim, not reimplemented
348 of 348 rule lines byte-identical to the design. No Tailwind, no token rewrite.
*Why:* only way to guarantee pixel fidelity; future design changes are a one-file
diff against the source.

### 3.2 `Available<T>` instead of `number | null` for ratios
*Why:* BR-04 says "a zero/missing denominator returns unavailable, never zero
risk". A nullable number lets a caller write `lvr ?? 0`. This type makes that
impossible. Still the single most load-bearing type decision in the codebase.

### 3.3 `allocateMoney` uses largest-remainder, not per-part rounding
*Why:* BR-06 requires rounding defined at allocation boundaries "so totals
balance". Naive rounding loses or gains cents on a 60/40 split of an odd amount.
Tested against six awkward divisions.

### 3.4 Permissions enforced at each module's `api.ts`
*Why:* NFR-01 says "enforce server-side across views, search, jobs, downloads and
exports", and UAT-04 tests that a delegate cannot reach totals "through direct
URLs, exports, search or document links". A check in a component is bypassed by a
direct URL; a check per route file means one forgotten file is a hole. The module
API is a single door that pages, JSON routes and exports all pass through.

### 3.5 Exports resolve two permissions, not one
*Why:* "Exports must apply the same permissions as the screen." An accountant
holds `export.create` but not `portfolio.totals.read`, so they can export
expenses and are refused net worth. Holding one right without the other denies.

### 3.6 Corrections append; nothing is overwritten or deleted
Expenses version, reversals are new negative allocations, documents are hidden.
*Why:* FR-04 — "corrections shall be versioned; deletion must not erase audit
history".

### 3.7 Derived state is never stored
Obligation status, lease status, arrears, bill splits, import counters.
*Why:* a stored status drifts the moment a due date passes. Also makes every
figure explainable from its inputs, which FR-09 requires.

### 3.8 Staged transactions and posted cash flow are separate collections
*Why:* an import in progress must never move a historical figure. Also lets the
chart and month KPIs match the design exactly.

### 3.9 Computed figures over prototype placeholders
Where the prototype's numbers do not reconcile with the records on the same
screen, the app computes and the divergence is documented with arithmetic in
`docs/DESIGN_FIDELITY.md` §3. The requirements document vindicated two of these:
the prototype counts a receivable as debt (contra FR-11) and reports a repayment
split that its own IO facility makes impossible.

## 3.10 The seed is a demonstration dataset, deliberately shaped

Every section now holds enough data to demonstrate its filters and states: 23
obligations, 142 documents, 49 expenses, 11 shared bills, 6 ended leases, 28
audit events, 12 valuations, 12 months of posted cash flow.

**Properties, loans and arrears-bearing leases were left untouched on purpose.**
They drive the figures that match the prototype exactly, and changing them would
silently break that correspondence. If you add to them, expect
`tests/uat-05-dashboard-fixtures.test.ts` to fail — its fixtures are hand-derived,
so a failure there means *update the fixture consciously*, not patch the test.

Two mistakes made while building this dataset, both caught by tests, both worth
avoiding again:

- A "historical" Mians Rd valuation was dated **after** the 2023 purchase price it
  was meant to precede, so `latestValuation` silently picked it up and assets fell
  by $25,000. Valuation history must be dated before the current record.
- Electricity bills were pointed at the 60/40 **water** agreement, whose effective
  period starts 1 July, so every earlier bill showed as blocked. Common-area
  electricity now has its own standing agreement.

## 4. Assumptions still needing confirmation

| # | Assumption | Impact if wrong |
| --- | --- | --- |
| 1 | Only property and receivables are in scope as assets | Net worth is $2,163,300, not the prototype's $4,821,300 |
| 2 | Portfolio LVR uses securing collateral; stale valuations are ineligible | The tile reads "Unavailable" instead of 32.6% |
| 3 | "Due soon" horizon is 14 days for both KPI and list | Now matches the prototype exactly: 7 items · $9,320 |
| 4 | Facility debt splits evenly across named borrowers | Per-entity positions change |
| 5 | Pool allocation stays unapproved, so no pooled per-property LVR is published | CBA-secured properties show a chip instead of a ratio |
| 6 | Repayment principal/interest come from statements, not derivation | Split reads $854/$11,086, not the prototype's $9,140/$2,800 |
| 7 | Counts derive from records rather than the prototype's labels | Now aligned: obligations 23, documents 142, entities 6 |
| 8 | A financial position reports the latest *posted* month, not the current one | August figures shown on a 6 Sep as-of date |

## 5. Known gaps

### Blocked on decisions (see `REQUIREMENTS_CHECKLIST.md` §7)
- Bank CSV format undefined → no parser can be written.
- Cross-collateral allocation policy unapproved → every pooled LVR is withheld.
- Proration and bond rules unapproved → surfaced as blocking notes, not guessed.

### Required by the document, not yet built
- **FR-05**: early termination (remove only unearned future charges), effective
  rent changes, charge persistence on lease creation.
- **FR-02**: purchase and settlement costs.
- **FR-08**: no scheduler runs the dispatch job; no delivery provider; "failure
  creates an owner task" needs a task entity.
- **FR-09**: scope switching by entity/property/period — the sidebar pill is static.
- **NFR-01**: MFA (no authentication exists at all).
- **NFR-02/04/05/06**: encryption, backups, availability, performance benchmarks.
- **UAT-06**: cannot pass without persistence and backups.

### Built read-only
No create/edit forms anywhere. Service methods and Zod schemas exist; buttons
raise a toast.

## 6. Non-obvious things worth knowing

- **`createCollection` caches on `globalThis`.** Editing a seed file does **not**
  reseed a running dev server — restart it. This has cost time twice; it looks
  like stale data or a broken calculation.
- **`pkill -f "next start"` does not kill the server.** The process is named
  `next-server`. Use `lsof -i :3000 -sTCP:LISTEN` and kill the PID. This cost time
  once: new routes appeared to 404 while a stale build was being served.
- `src/shared/config/navigation.ts` is the single source for the sidebar, mobile
  tab bar and page titles. Adding a screen means one entry there.
- `DataTable` emits each column header as `data-l` on its cells; that attribute
  drives the ≤840px collapse to label/value cards. Omitting a header breaks mobile.
- `UPCOMING_WINDOW_DAYS` in `app-config.ts` drives both the "Due in next N days"
  KPI and the dashboard list. Set it to 24 to reproduce the prototype's four-row card.
- `AS_OF_DATE` defaults to `2026-09-06` so the app reproduces the pinned prototype.
- The June snapshot in `dashboard/data/seed.ts` is set so the *reported movements*
  (+2.1%, $14,200) match the design while absolute totals stay derived.
- `Collection.reset()` is exposed on `leasesRepository` and
  `obligationsRepository` for tests. Add it to others as they gain write paths.
- Tests import from `@/` via the alias in `vitest.config.ts`.

## 7. Next session — start here

1. **Work the open-decision register** (`REQUIREMENTS_CHECKLIST.md` §7). Nothing
   downstream of those decisions can be built correctly without them.
2. **Close the FR-05 gaps** — termination and rent changes are explicit
   acceptance criteria that currently fail.
3. **Then persistence** (`IMPLEMENTATION_PLAN.md` §B), which unblocks UAT-06 and
   the NFR-06 performance benchmarks.

## 8. Change log

| Date | Change |
| --- | --- |
| 2026-09-07 | Session 1: built from the design alone. 9 modules, 10 screens, 16 API routes, full documentation. Design verified byte-identical. |
| 2026-09-08 | Session 3: filled the seed out into a demonstration dataset — every section and filter now has content. Closed five documented divergences (obligations 23, documents 142, entities 6, unlinked 2, upcoming 7 items/$9,320). Headline figures unchanged and still fixture-tested. |
| 2026-09-07 | Session 2: requirements document received. Added `shared-bills` (FR-07) and `expenses` (FR-04); BR-06 money/date discipline; BR-03 separated reporting; BR-05 credits and reversals; FR-06 duplicate-import protection; FR-08 idempotent dispatch; FR-09 drill-down and permission-parity exports; NFR-01 server-side enforcement. 110 tests including UAT-01…07. Fixed a cash-flow chart anchoring bug the tests exposed. |
