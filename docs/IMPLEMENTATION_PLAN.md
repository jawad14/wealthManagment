# Implementation plan

## Phase 0 — Foundations ✅

| Step | Outcome |
| --- | --- |
| Analyse the design prototype | 10 screens, 25 icons, 348 CSS rule lines, FR/BR/NFR references catalogued |
| Scaffold Next.js 15 + TypeScript 5.8 | Strict mode with `noUncheckedIndexedAccess` |
| Port the stylesheet verbatim | Split into 5 layers, verified byte-identical |
| Extract the icon sprite | Generated `IconSprite.tsx` from the source SVG |
| Shared kernel | `Money` (integer cents), `IsoDate`, branded ids, `AppError`, `Available<T>` |
| Data seam | `createCollection` — one file to swap for a real database |
| HTTP seam | Response envelope, error→status mapping, `handle`/`parseBody`/`parseQuery` |
| Design-system components | 20 primitives carrying the prototype's class names |
| App shell | Sidebar, top bar, mobile drawer + scrim, bottom tab bar, toast |

## Phase 1 — Feature modules ✅

Built in dependency order, so each module compiled against a stable base:

| Order | Module | Delivered |
| --- | --- | --- |
| 1 | `access` | Users, grants, audit log, continuity posture; `record()` used by every mutating service |
| 2 | `entities` | Ownership graph; share/control split enforced at load time (BR-02) |
| 3 | `properties` | Valuations, staleness + market-basis eligibility, occupancy, ownership gaps |
| 4 | `loans` | Facilities, receivables (FR-11), `Available<T>` ratios (BR-04), pool allocation policy |
| 5 | `leases` | Tenants, leases, charges, allocations, derived arrears (BR-05) |
| 6 | `obligations` | Reminder eligibility, derived status, generated timelines (FR-03, FR-08) |
| 7 | `reconciliation` | Staged import, confidence, confirmation, posted cash-flow history (FR-06, BR-03) |
| 8 | `documents` | Register, versions, links, hide-not-delete (FR-04) |
| 9 | `dashboard` | Net worth (BR-01), look-through positions (BR-02), cash flow, attention items |

## Phase 2 — Screens ✅

All ten prototype views, as real routes:

`/dashboard` · `/obligations` · `/bank-import` · `/loans` · `/properties` ·
`/properties/[propertyId]` · `/leases` · `/entities` · `/documents` · `/access` ·
`/design-system`

Server Components render from module services; `'use client'` only where
interaction requires it.

## Phase 3 — API ✅

16 route handlers over the module `api.ts` files, with Zod validation at the
boundary and a single error-mapping point. See `ARCHITECTURE.md#http-api`.

## Phase 4 — Documentation ✅

`README.md`, `AGENTS.md`, `PROJECT_MEMORY.md`, per-module `README.md`, plus
`ARCHITECTURE.md`, `MODULE_MAP.md`, `REQUIREMENTS_CHECKLIST.md`,
`DESIGN_FIDELITY.md`.

## Phase 5 — Verification ✅

- CSS parity verified programmatically (348/348 rule lines identical).
- All 10 screens and all 16 API routes return 200.
- `tsc --noEmit`, `next lint` and `next build` clean.
- Every computed figure cross-checked against the prototype; divergences
  documented with arithmetic in `DESIGN_FIDELITY.md`.

---

## Phase 6 — Requirements document received ✅

`Wealth_Platform_Requirements_Analysis.docx` arrived after Phase 5. Two of the
inferred requirement identifiers were **wrong**, and one business rule was missing
entirely. Closing those gaps:

| Gap found | Work done |
| --- | --- |
| **FR-07 is "Shared bills and recoveries"**, an MVP module previously inferred as *unknown* and not built | New `shared-bills` module: approved allocation agreements, 60/40 splits, recovered-vs-owner separation, blocked-split reasons |
| **BR-06 did not exist in the inferred set** | `allocateMoney` (largest-remainder, exact), `AmountBasis` (actual/forecast/estimated), effective vs posting dates |
| **FR-04's expense half was missing** — only documents were built | New `expenses` module: append-only revisions, void-not-delete, allocation and source on every record |
| **BR-03 requires cash flow, operating result and tax reported separately** | `financialPosition()` splits all three; tax deliberately returns `null` with a note |
| **BR-05 needed credits and reversals** | `AllocationKind`, negative reversal allocations, approver-required credits |
| **FR-06 needed duplicate-import protection** | `recordReceipt` is idempotent on `bankTransactionId` |
| **FR-08 needed a retry-safe key** | `buildDispatchKey`, status recheck at send time, quiet-hours deferral |
| **FR-09 needed drill-down and permission-parity exports** | `/explain/[metric]` (6 metrics, all reconcile) and `/api/exports/[metric]` |
| **NFR-01 required server-side enforcement** | `permissions.ts` capability model; `accessService.guard()` at every module API |
| **The document mandates acceptance tests** | 110 tests including UAT-01…07 |

**Bug found by the new tests:** the cash-flow chart was anchored on the month
containing `asOf` rather than the latest posted month, appending an empty bar for
an unreconciled period — which reads as a collapse in receipts. Fixed; the chart
now ends at August, matching the design.

FR-10, FR-11 and FR-12 are Release 2/3 in the document and are correctly not
built.

---

## Next — in priority order

### A. Resolve the document's open decisions (§10)
The register in `REQUIREMENTS_CHECKLIST.md` §7 lists what each decision blocks.
The highest-value ones are the consolidation method, the bank CSV format (no
parser can be written without a sample), and the cross-collateral allocation
policy (which currently withholds every pooled LVR).

### B. Persistence
Replace `createCollection` with a Postgres-backed implementation of the same
`Collection<T>` interface. Suggested: Drizzle or Prisma with a schema mirroring
the module models. **No module code should change.** Add migrations and move the
seeds into a seeding script.

### C. Authentication and permissions
1. Session-based auth; replace `CURRENT_USER_ID`.
2. Enforce `AccessGrant` at the query layer — the module is scoped for it, but
   grants are currently descriptive only.
3. Add the "limited view" scope variant the design system describes.
4. MFA enrolment for roles that require it.

### D. Write paths
Creation and edit forms for entities, properties, leases, loans and obligations.
The service methods and Zod schemas already exist; the UI does not.

### E. Reminder scheduler (FR-08)
A job that walks eligible obligations, respects quiet hours, re-checks
paid/disputed status immediately before sending, delivers via in-app + email,
and escalates to an owner task on failure or non-payment.

### F. Real bank import (FR-06)
CSV/OFX parsing, duplicate detection on (date, amount, reference), a matching
engine to replace the seeded suggestions, and step 5 of the wizard — posting
confirmed rows to a ledger.

### G. Document storage (FR-04)
Object storage with signed URLs, upload, preview, and version diffing.

### H. Drill-down (FR-09)
"Explain this total" — a view listing the records behind any KPI, down to the
source document. The design states this as a rule; the link is currently a
placeholder.

### I. Scope switching
The sidebar scope pill is present but static. Wire it to filter every screen by
entity, property and period.

### J. Remaining requirement gaps
In the order the document's own acceptance criteria demand:

1. **FR-05 termination and rent changes** — "an early termination removes only
   unearned future charges and leaves receipts intact" is not implemented, and
   effective rent changes are not modelled.
2. **FR-05 charge generation** — the schedule is previewed but not persisted on
   lease creation.
3. **FR-02 purchase and settlement costs** — required by the requirement text,
   currently absent from `Property`.
4. **FR-08 escalation** — "failure creates an owner task" needs a task entity.
5. **FR-09 scope switching** — "filter by authorised entity/property/period"; the
   sidebar scope pill is still static.
6. **UAT-06** — cannot pass until persistence and backups exist.

### K. Test coverage to extend
110 tests cover BR-03/05/06, FR-04/07/09 and UAT-01/02/03/04/05/07. Not yet
covered: the `properties` valuation-basis matrix, `documents` versioning, and the
HTTP layer's error mapping. `Collection.reset()` (exposed on `leasesRepository`
and `obligationsRepository`) gives each test a clean fixture; add it to other
repositories as they gain write paths.
