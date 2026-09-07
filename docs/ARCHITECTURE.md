# Architecture

## Shape

A modular monolith. One Next.js application; each business capability is a
self-contained module with its own model, data access, business logic,
validation, HTTP handlers and presentation.

```
src/
├── app/                    Next.js routing only — thin
│   ├── (app)/<route>/      Screens (Server Components)
│   └── api/<resource>/     Route handlers (adapters over module api.ts)
├── modules/<feature>/      One directory per business capability
│   ├── README.md           Responsibility, rules, dependencies
│   ├── model.ts            Domain types + invariants
│   ├── data/seed.ts        Seeded records
│   ├── repository.ts       Data access (only file touching storage)
│   ├── service.ts          Business logic
│   ├── validation.ts       Zod schemas
│   ├── api.ts              Transport-agnostic handlers
│   └── components/         Presentation
├── shared/                 Cross-cutting, feature-agnostic
│   ├── components/         Design-system primitives
│   ├── shell/              App chrome (sidebar, top bar, tab bar, toast)
│   ├── lib/                money, dates, errors, result
│   ├── types/              Branded ids, primitives
│   └── config/             App config, navigation model
├── server/                 Server-only infrastructure
│   ├── db/collection.ts    The single data-access seam
│   └── http/               Response envelope, error mapping, route helpers
└── styles/                 Design CSS, ported verbatim
```

## The four layers

| Layer | May import | May not import |
| --- | --- | --- |
| `components/` | shared components, module model | repositories, `next/server` |
| `service.ts` | model, repository, other modules' services | React, `next/server`, storage directly |
| `repository.ts` | model, `@/server/db/collection` | services, components |
| `api.ts` | service, validation | `NextRequest` / `NextResponse` |

`api.ts` being transport-agnostic is what lets the same handler be called from a
route file, a scheduled job, or a test without a fake HTTP request.

## Module dependency graph

Arrows point from dependant to dependency. The graph is acyclic and enforced by
convention plus review.

```
              ┌──────────┐
              │  access  │  users, grants, audit
              └────┬─────┘
                   │
              ┌────▼─────┐
              │ entities │  ownership graph (BR-02)
              └────┬─────┘
                   │
            ┌──────▼───────┐
            │  properties  │  valuations, components
            └───┬──────┬───┘
                │      │
         ┌──────▼──┐ ┌─▼───────┐
         │  loans  │ │ leases  │
         └──────┬──┘ └─┬───────┘
                │      │
                │  ┌───▼──────────┐
                │  │ shared-bills │  FR-07 recoveries
                │  └───┬──────────┘
                │      │
   ┌────────────┼──────┼─────────┬─────────────────┬──────────────┐
   │            │      │         │                 │              │
┌──▼──────────┐ │      │  ┌──────▼─────────┐ ┌─────▼────┐ ┌───────▼──────┐
│ obligations │ │      │  │ reconciliation │ │ expenses │ │  documents   │
└──────┬──────┘ │      │  └──────┬─────────┘ └─────┬────┘ └──────────────┘
       │        │      │         │                 │
       └────────┴──────┴─────────┴─────────────────┘
                   │
             ┌─────▼──────┐
             │ dashboard  │  composes everything, exports to nothing
             └────────────┘
```

## Permission enforcement (NFR-01)

The requirement is explicit: *"Deny by default; enforce record/entity permissions
server-side across views, search, jobs, downloads and exports."*

The enforcement point is **each module's `api.ts`**, not the route file and not
the component:

```
page.tsx ─┐
route.ts ─┼─→ module api.ts ─→ accessService.guard(capability) ─→ service
export   ─┘                              │
                                    throws ForbiddenError
```

Putting the check in a component would be no enforcement at all — a direct URL
bypasses components entirely, which is exactly what UAT-04 tests. Putting it in
each route file would mean one forgotten file is a hole. At the module API there
is a single door.

`AccessScope` combines two things: the **capabilities** a role holds (a
capability absent from the role's list is denied) and the **records** a grant
reaches (`scope: 'all'` or a named set of properties/entities). Exports resolve
*both* the right to export and the right to read the metric, so an accountant who
may export is still refused a total they cannot see.

## Data flow

**Screens** are Server Components that call module services directly — no HTTP
round-trip for the first render, so nav badges and totals are resolved before the
shell paints.

```
page.tsx (server) → module service → repository → collection
                 ↓
         module components (client where interaction is needed)
```

**The JSON API** exists for programmatic access and future clients, and runs
through the same services:

```
route.ts → parseQuery/parseBody (Zod) → module api.ts → service → repository
                                              ↓
                              handle() → jsonOk / jsonError
```

Validation and error mapping happen in exactly one place each.

## Data access

`src/server/db/collection.ts` is the only storage seam. Every repository is built
on `createCollection`, which:

- freezes records in and copies out, so stored state cannot be mutated by accident;
- caches collections on `globalThis`, so in-session writes survive Next.js hot
  reload in development;
- exposes `reset()` for tests.

Replacing the in-memory store with Postgres means reimplementing this one file's
`Collection<T>` interface. No module changes.

> Note: because collections are cached across hot reloads, **editing a seed file
> does not reseed the running dev server.** Restart `npm run dev` to pick up seed
> changes.

## Typed money and dates

- `Money` is `{ cents: number; currency: CurrencyCode }` with integer cents.
  `money()` throws on a non-integer, so a floating-point amount cannot enter the
  system unnoticed.
- `IsoDate` is a `"YYYY-MM-DD"` string; all arithmetic is UTC and lives in
  `@/shared/lib/dates`.
- Ids are branded (`Id<'Property'>`), so a `LeaseId` cannot be passed where a
  `PropertyId` is expected.

## Availability instead of nullable ratios

`Available<T>` (`@/shared/lib/result`) makes "we don't know" a first-class state
distinct from zero:

```ts
type Available<T> =
  | { available: true; value: T }
  | { available: false; reason: string };
```

Every LVR and coverage ratio returns this. The compiler forces callers to handle
the unavailable branch, which is how BR-04's "Unavailable beats zero" is enforced
structurally rather than by discipline.

## Errors

Services throw `AppError` subclasses (`NotFoundError`, `ValidationError`,
`ForbiddenError`, `ConflictError`, `PolicyRequiredError`). `src/server/http/respond.ts`
is the only file that maps them to status codes:

| Code | Status |
| --- | --- |
| `VALIDATION_FAILED` | 400 |
| `UNAUTHENTICATED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `POLICY_REQUIRED` | 422 |
| `INTERNAL` | 500 |

Unexpected errors are logged server-side and returned as a generic 500 — internals
are never leaked to the client.

## HTTP API

All responses are enveloped: `{ "data": … }` or `{ "error": { code, message, details? } }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/dashboard` | Full portfolio overview (FR-09) |
| GET | `/api/dashboard/net-worth` | Net worth and components (BR-01) |
| GET | `/api/dashboard/ownership` | Consolidated positions (BR-02) |
| GET | `/api/entities` | Entities and relationships (FR-01) |
| GET | `/api/properties` | Properties, valuation status, occupancy (FR-02) |
| GET | `/api/properties/:id` | One property |
| GET | `/api/obligations` | Obligations with derived status (FR-03, FR-08) |
| GET | `/api/obligations/:id` | One obligation with reminder timeline |
| POST | `/api/obligations/:id/payment` | Close with payment evidence |
| GET | `/api/leases` | Leases (FR-05) |
| GET | `/api/leases/arrears` | Arrears positions (BR-05) |
| GET | `/api/loans` | Facilities with LVR availability (FR-03, BR-04, FR-11) |
| GET | `/api/bank-import` | Current import and staged rows (FR-06) |
| POST | `/api/bank-import/transactions/:id/confirm` | Human confirmation |
| GET | `/api/documents` | Document register (FR-04) |
| GET | `/api/access` | People, grants, audit, continuity (NFR-01, NFR-03) |
| GET | `/api/shared-bills` | Bills with resolved splits and recoveries (FR-07) |
| GET | `/api/expenses` | Expense register, totals, category breakdown (FR-04) |
| GET | `/api/explain/:metric` | The records behind a total (FR-09 drill-down) |
| GET | `/api/exports/:metric` | CSV of those records, same permissions (FR-09) |

`/api/exports/:metric` returns a file rather than the JSON envelope, so it
handles its own errors while still resolving permissions in the service.

All list endpoints accept an `asOf=YYYY-MM-DD` query parameter where the read
model is date-dependent.

## Styling

The prototype's single `<style>` block is split into five ordered layers —
`tokens`, `fonts`, `base`, `shell`, `components`, `responsive` — imported by
`src/styles/globals.css` in the original cascade order. The rules are
byte-identical to the source (verified: 348 rule lines).

`fonts.css` is the only addition: it binds the design's `--font` token to the
locally-hosted IBM Plex Sans that `next/font` injects, preserving the original
fallback stack.

## Rendering

Server Components by default. `'use client'` appears only where interaction
requires it: filter groups, tabs, the mobile drawer, the toast, and the forms.
The chrome resolves its badges and as-of date on the server, so navigation never
flashes empty counts.
