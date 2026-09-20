# Module: reconciliation

**Responsibility** — bank statement import, duplicate detection, match
suggestion, human confirmation, and posted cash-flow history. Covers FR-06 and
supplies the BR-03 cash-basis figures.

**Key rules**
- **A suggestion is not a posting.** Every staged row keeps the raw bank text,
  the machine's suggestion *and* the human's correction. Nothing reaches the
  ledger without a person confirming it.
- `rawDescription` is never overwritten.
- Bulk "confirm all high-confidence" touches only rows at or above
  `HIGH_CONFIDENCE_THRESHOLD`; low-confidence and unmatched rows are never swept
  up by a bulk action.
- Internal transfers and loan drawdowns are excluded from cash flow (BR-03).
- **Staged rows and posted history are separate collections.** An import in
  progress can therefore never move a historical figure.
- **Posting is the only bridge between them** (`postToLedger`). It is refused
  while any row is `auto-matched` or `needs-review`. Unmatched rows neither block
  nor post. Confirmed rows are rolled into the `PostedCashFlowMonth` they fall in
  (transfers excluded, BR-03) and stamped `postedAt`; a stamped row is never
  rolled up again and can no longer be changed. Allocating a leftover unmatched
  row later makes the import postable again for just that row.
- `stage: 'posted'` is terminal and is not a stepper step — it means step 5 is
  done. `loanPrincipalComponent` is not updated by posting: a bank line does not
  say how much of a repayment was principal.
- A human allocation of `INTERNAL_TRANSFER_ALLOCATION` outranks the matcher's
  suggestion when deciding what is excluded from cash flow.

- **A CSV upload starts a new import cycle** (`createImportFromCsv`, parser in
  `csv-parser.ts`). Headers `Date, Amount, Description, Reference` are matched by
  name; one unreadable row rejects the whole file, so half a statement is never
  staged. Amounts are read as digits into integer cents, never through a float.
- **Duplicates are skipped, not staged twice.** A row matching an already-staged
  row on date, amount and reference ("Ref 166C-R3" equals "166C-R3"; no
  reference falls back to the narration) is counted in `duplicatesSkipped`. A
  file that is all duplicates is a `ConflictError` and creates nothing.
- **The matcher only suggests.** A receipt quoting a lease's billing reference
  scores `REFERENCE_MATCH_CONFIDENCE` (0.9); a tenant surname or a property's
  short name scores `NAME_MATCH_CONFIDENCE` (0.6); anything else is `unmatched`.
  A lease is considered only if it was running on the transaction date, only for
  money coming in, and references match as whole tokens ("166C-R1" is not
  "166C-R1-P"). A new import opens at `match`, even with duplicates skipped — an
  import parked at `duplicates` could never be posted.

**Owns** — `BankImport`, `StagedTransaction`, `MatchSuggestion`,
`PostedCashFlowMonth`.

**Depends on** — `access` (audit trail), `leases` and `properties` (read-only,
for match suggestions).

**Depended on by** — `dashboard` (cash-flow chart, month KPIs, unmatched
attention item, sidebar badge).

**Not yet implemented** — OFX parsing, bank-specific CSV layouts (separate
debit/credit columns, balance columns), matching beyond reference and name
(amount-to-charge matching, learned suppliers, transfer detection), a review
list of the skipped duplicate rows, a transaction-level ledger (posting rolls into
monthly cash flow only; it does not create rent allocations or expenses),
re-allocation UI.
