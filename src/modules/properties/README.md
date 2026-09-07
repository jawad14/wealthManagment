# Module: properties

**Responsibility** — properties, their valuations and their operational
components (rooms). Covers FR-02.

**Key rules**
- A property is the unit that counts **once** in net worth. Rooms are components:
  they carry leases and occupancy, never their own valuation.
- A valuation is *eligible for ratios* only when it is a market assessment
  (`bank`, `agent-appraisal`) inside the 12-month staleness window. Purchase
  price and build cost record what was paid, not current value, so they are
  never eligible however recent they are.
- Stale valuations are still **displayed** — the portfolio should not lose an
  asset because its paperwork aged — but they must not drive a ratio.

**Owns** — `Property`, `Valuation`, `PropertyComponent`.

**Depends on** — `entities` (ownership shares, for gap detection), `@/shared/*`.

**Depended on by** — `loans` (collateral valuations), `leases` (property labels),
`dashboard` (asset totals, stale counts, ownership gaps).

**Deliberately does not** — know about rent, debt or arrears. Those belong to
`leases`, `loans` and `dashboard`; the property page composes them at the edge.

**Not yet implemented** — valuation history UI, the Overview/Loans/Obligations/
Documents/Valuations/History tabs on the detail card, property CRUD.
