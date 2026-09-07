# Module: shared-bills

**Responsibility** — utilities and shared costs: one supplier bill split across
the leases that consumed it, and the recovery position that follows. Covers
FR-07.

**Key rules**
- **A recovered amount is a tenant charge, not an owner expense.** Only the
  unrecovered remainder is the owner's cost. Counting both would double-count in
  consolidation — the acceptance criterion tests exactly this.
- **Splits come from an approved agreement, never inference.** An agreement must
  be approved *and* effective for the bill's date. If it is not, the bill is
  shown as blocked with the reason and the whole amount falls to the owner. The
  platform does not guess a split.
- **Shares are recomputed, never trusted from storage.** `allocate()` derives
  every share from the bill total and the weights via `allocateMoney`, so parts
  sum to the total exactly (BR-06). A stored amount can never drift from its bill.
- **Recoverability and deadlines are reviewed inputs.** `recoveryReviewedOn:
  null` means "not yet reviewed", deliberately distinct from "not recoverable".
  No statutory deadline is inferred or hard-coded.
- Superseded agreements are retained, so a split changed from 50/50 to 60/40
  leaves both records inspectable.

**Owns** — `SharedBill`, `AllocationAgreement`, `BillShare`, `BillAllocation`.

**Depends on** — `properties`, `leases` (share targets), `@/shared/*`.

**Depended on by** — `expenses`/`dashboard` for the owner-cost figure.

**Tests** — `tests/fr-07-shared-bills.test.ts` covers the acceptance criteria
(60/40 → $120/$80, no duplicate owner expense, invalid allocation rejected).

**Not yet implemented** — creating bills and agreements through the UI, pushing
recovered shares into the lease charge ledger, agreement approval workflow.
