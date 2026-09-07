# Module: loans

**Responsibility** — facilities, balances, repayments, collateral and gearing
ratios. Covers FR-03, FR-11 and BR-04.

**Key rules**
- **Direction matters (FR-11).** Money lent out is a `receivable` — an asset. It
  is never added to debt and never treated as an expense.
- **Unavailable beats zero (BR-04).** Every ratio returns `Available<number>`,
  so a missing or stale valuation renders as "Unavailable", never as 0%.
  Callers must handle the unavailable branch — that is the point of the type.
- **A pool needs a policy.** A cross-collateralised facility has no per-property
  LVR until an allocation policy is *approved*. An unapproved policy may inform a
  provisional working figure but must not publish a ratio.
- `portfolioLvr` is deliberately strict: if any securing property lacks an
  eligible valuation the denominator is incomplete, so it reports Unavailable
  rather than a flattering number.

**Owns** — `Loan`, `InterestRate`, `Repayment`, `LoanSecurity`,
`DebtAllocationPolicy`.

**Depends on** — `properties` (valuation eligibility), `entities` (borrowers).

**Depended on by** — `dashboard` (liabilities, receivables), `properties` page
(per-property debt).

**Not yet implemented** — amortisation schedules, rate-change history, offset
account modelling, loan CRUD.
