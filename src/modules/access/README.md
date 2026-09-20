# Module: access

**Responsibility** — people, roles, what each person can see, the audit log, and
the emergency-access/continuity posture. Covers NFR-01 (access control) and
NFR-03 (auditability).

**Owns** — `User`, `AccessGrant`, `AuditEvent`, `ContinuityPosture`.
This is the only module that may create or mutate `User` records.

**Depends on** — `@/shared/*`, `@/server/db/collection`. No other feature module.

**Depended on by** — every module that attributes an action to a person
(`obligations`, `documents`, `reconciliation`, `properties`). They import
`accessService.resolveUserName` / `accessService.getCurrentUser` and must not
read the access repository directly.

**Key files**
| File | Purpose |
| --- | --- |
| `model.ts` | Domain types and role labels |
| `data/seed.ts` | Seeded people, grants, audit trail |
| `repository.ts` | Storage access (only file touching the collection) |
| `service.ts` | Business logic, `record()` audit append |
| `validation.ts` | Zod schemas for queries and invitations |
| `api.ts` | Handlers used by `src/app/api/access/*` |
| `components/` | Presentation for the Access & audit screen |

**Who may open the screen** — `accessApi.getOverview` refuses anyone holding
neither `access.read` nor `audit.read`. With `audit.read` alone (technical
operator) it returns the audit log and nothing else. Inviting needs
`access.write`; the screen hides the form from everyone else and `inviteAction`
refuses them regardless. `ROLE_SUMMARIES` in `model.ts` is the plain-words
description of each role shown while granting access.

**Test-persona switcher** — `accessService.switchUser` / `switchUserAction` change
who `getCurrentUser()` and `guard()` resolve to, driven from the top bar avatar
(`src/shared/shell/UserMenu.tsx`). The active id is process-wide, needs no
capability, and is audited. It stands in for sign-in and must go when real
authentication lands.

**Not yet implemented** — real authentication/session, permission enforcement on
queries (grants are currently descriptive), invitation delivery. See
`docs/REQUIREMENTS_CHECKLIST.md`.
