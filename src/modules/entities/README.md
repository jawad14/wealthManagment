# Module: entities

**Responsibility** — who owns what. Entities (individuals, companies, trusts,
SMSFs), their dated relationships, and the ownership claims that BR-02
consolidation is built on. Covers FR-01.

**The rule this module exists to protect (BR-02)** — ownership carries a share;
control does not. `director-of`, `trustee-of`, `beneficiary-of`, `member-of` and
`borrower-of` can never hold a `sharePercent`. `assertShareIntegrity` throws at
load time if the graph violates this, because a share on a control relation
would silently double-count an asset in every portfolio total.

**Owns** — `Entity`, `Relationship`, `OwnershipClaim`. Also declares the
canonical `PROPERTY_IDS` used by the ownership graph.

**Depends on** — `@/shared/*`, `@/server/db/collection`.

**Depended on by** — `properties` (ownership gaps), `dashboard` (consolidation),
`loans` (borrower names), `obligations` (holding entity labels).

**Deliberately does not** — compute money. It resolves *who owns how much of
what*; the `dashboard` module multiplies those claims by valuations and debt.
Keeping them apart makes the ownership rules testable without any valuation data.

**Key files** — `model.ts`, `data/seed.ts`, `repository.ts`, `service.ts`,
`validation.ts`, `api.ts`, `components/`.

**Not yet implemented** — beneficiary percentage assignment, entity CRUD through
the UI, multi-level look-through for company-owned companies.
