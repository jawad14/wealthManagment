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

**Owns** — `BankImport`, `StagedTransaction`, `MatchSuggestion`,
`PostedCashFlowMonth`.

**Depends on** — `access` (audit trail).

**Depended on by** — `dashboard` (cash-flow chart, month KPIs, unmatched
attention item, sidebar badge).

**Not yet implemented** — actual CSV/OFX parsing and upload, the matching engine
itself (suggestions are seeded), posting to a ledger, re-allocation UI.
