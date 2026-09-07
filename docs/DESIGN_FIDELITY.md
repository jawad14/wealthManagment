# Design fidelity report

Verification of the running application against
`design/wealth-platform-design.html`.

The prototype is the source of truth for **design**: layout, colour, typography,
spacing, components and interaction. Its **numbers** are illustrative placeholders
— several of them do not reconcile with the records shown on the same screen, and
one contradicts a rule the design itself states. Where that happens the app
computes the figure from its records and the divergence is documented below with
the arithmetic.

## 1. Design preserved exactly

### Stylesheet — byte-identical
The prototype's `<style>` block was split into
`tokens / base / shell / components / responsive` and verified programmatically:

```
original rule lines: 348
ported   rule lines: 348
IDENTICAL (ignoring blank lines between sections): True
```

Nothing was rewritten, renamed, or converted to a utility framework. Every class
name, token, breakpoint and media query is the original.

- Palette: all 33 CSS custom properties, light and dark, unchanged.
- Dark mode: both `prefers-color-scheme` and `[data-theme]` blocks preserved.
- Breakpoints: 1320px, 1180px, 840px, plus `prefers-reduced-motion` — unchanged.
- Radii, shadows, sidebar/topbar/tabbar dimensions — unchanged.

### Icons
All 25 SVG symbols were extracted programmatically from the prototype's sprite
and emitted as `IconSprite.tsx`. Path data is unmodified; `<Icon />` renders the
same `<svg class="i"><use href="#i-*"/></svg>` markup.

### Typography
IBM Plex Sans at 400/500/600 plus 400 italic, now self-hosted via `next/font`
(faster and privacy-preserving) rather than fetched from Google's CDN.
`fonts.css` binds it to the design's `--font` token, keeping the original
fallback stack. Tabular numerals (`.num`) retained on every figure.

### Layout and responsive behaviour
- Desktop: 248px sidebar + fluid content capped at 1440px.
- ≤840px: sidebar becomes a drawer over a scrim, bottom tab bar appears, tables
  collapse to label/value cards via `table.stack-m` and `data-l` attributes.
- The `data-l` mechanism is preserved: `DataTable` emits each column's header as
  `data-l` on its cells, and marks the primary column `lead`.

### Accessibility (NFR-07)
- Every status chip pairs colour with an icon **and** words.
- `aria-pressed` on filters, `aria-current` on nav and tabs, `aria-selected` on
  tab strips and selectable rows.
- Clickable table rows gained keyboard handlers and `tabIndex` — an improvement
  on the prototype, which was mouse-only.
- Chart and ownership diagram keep `role="img"` with descriptive labels.

### Interaction parity
| Prototype behaviour | Implementation |
| --- | --- |
| View switching via `data-view` + `localStorage` | Real routes; browser history and deep links now work |
| Drawer open/close with scrim | `NavigationContext` |
| Filter pills toggle `aria-pressed` | `FilterGroup` with real state |
| Tab strips toggle `aria-selected` | `Tabs` |
| Toast for unwired actions | `ToastContext`, same markup and 2200ms timing |

## 2. Figures that now compute from records

These match the prototype exactly, because the seeded records reproduce them:

| Figure | Prototype | App | |
| --- | --- | --- | --- |
| Rent arrears total | $1,240 | $1,240 | ✅ |
| Arrears breakdown | 200 / 690 / 350 | 200 / 690 / 350 | ✅ |
| Arrears context | 3 tenants · 1 disputed | 3 tenants · 1 disputed | ✅ |
| Rent received · Aug | $28,410 | $28,410 | ✅ |
| Cash outgoings · Aug | $19,870 | $19,870 | ✅ |
| Net worth movement | +2.1% vs Jun | +2.1% vs Jun | ✅ |
| Principal repaid since Jun | $14,200 | $14,200 | ✅ |
| Rent received change | +3.4% vs Jul | +3.4% vs Jul | ✅ |
| Import: rows staged | 38 | 38 | ✅ |
| Import: auto-matched | 31 | 31 | ✅ |
| Import: needs review | 3 | 3 | ✅ |
| Import: unmatched | 4 · $3,120 | 4 · $3,120 | ✅ |
| Monthly repayments | $11,940 | $11,940 | ✅ |
| Next rate review | 30 Sep · Watson Rd · fixed 5.89% | identical | ✅ |
| Stale valuations | 3 | 3 | ✅ |
| Overdue obligations | 2 | 2 | ✅ |
| Obligations with no owner | 1 | 1 | ✅ |
| Ownership gap | Watson Rd: consolidation method not chosen | identical | ✅ |
| All property valuations & labels | 5 cards | identical | ✅ |
| Benton St rent/month | $2,990 | $2,990 | ✅ |
| Compton room table | 6 rows, balances −350/0/−200/+340/0 | identical | ✅ |
| Lease next-charge dates | 8 Sep, 9 Sep, Paused, 8 Sep | identical | ✅ |
| Patel lease status | Ends in 55 days | Ends in 55 days | ✅ |
| New lease charge count | 53 | 53 | ✅ |

## 3. Divergences, with reasons

### 3.1 Total debt — $2,206,700, not $2,326,700

The prototype's "Total debt" tile reads $2,326,700 and says "4 facilities".
The four facilities listed are:

```
Macquarie 4417   612,400  liability
CBA 8820       1,184,000  liability
ANZ 3305         410,300  liability
S. Khalid        120,000  RECEIVABLE  ("Receivable, not an expense (FR-11)")
                ─────────
liabilities    2,206,700
+ receivable     120,000
                ─────────
                2,326,700  ← the prototype's figure
```

The prototype adds the receivable into debt, which contradicts the FR-11 note
printed on that very row. The app counts it as an asset. **Total debt is
$2,206,700 across 3 liabilities.** This also changes the dashboard "Liabilities"
tile by the same $120,000.

*Recommend confirming against the requirements document; the app's treatment
follows FR-11 as the design states it.*

### 3.2 Assets and net worth — computed, and lower than the prototype

| | Prototype | App |
| --- | --- | --- |
| Assets | $7,148,000 | $4,370,000 |
| Liabilities | $2,326,700 | $2,206,700 |
| Net worth | $4,821,300 | $2,163,300 |

The prototype's three figures are internally consistent
(7,148,000 − 2,326,700 = 4,821,300) but its asset total cannot be reconstructed
from anything the design shows:

```
5 property valuations   4,250,000
+ loan receivable         120,000
                        ─────────
                        4,370,000   ← everything visible in the prototype
prototype assets        7,148,000
                        ─────────
unaccounted             2,778,000
```

There is no screen in the prototype showing the remaining $2.78M (cash, offset
balances, superannuation, or other holdings). Rather than invent records, the app
computes assets from what exists. Its ownership breakdown reconciles exactly:

```
Siddique Family Trust   1,529,700
Jawad Siddique            339,800
Mahvish Gull              219,800
Esteem Development         74,000
                        ─────────
                        2,163,300  = net worth ✅ (BR-02 verified)
```

The prototype's own entity figures do **not** reconcile this way — its dashboard
ownership view omits Mahvish entirely, and its Esteem figure ($1,810,000) cannot
be derived from Esteem's properties minus its debt ($1,258,000 − $1,184,000 =
$74,000).

**Open question for the requirements document: what asset classes beyond property
and receivables are in scope for Release 1?**

### 3.3 Portfolio LVR — "Unavailable", not 32.6%

The prototype shows 32.6%, labelled "Debt ÷ eligible collateral". That value is
reproducible only as `2,326,700 ÷ 7,148,000` — total debt over *total assets*,
not over collateral.

The app applies BR-04 strictly: two of the four properties securing debt
(20 Benton St, agent appraisal Jun 2025; Mians Rd, purchase price 2023) have no
valuation eligible for ratio maths, so the denominator is incomplete and the
ratio would understate gearing. It reports:

> **Unavailable** — Debt ÷ eligible collateral · 2 securing properties without an
> eligible valuation

This is the design's own "Unavailable beats zero" rule applied consistently. The
per-property LVR for Watson Rd (58.2%) still computes and matches the prototype.

### 3.4 Repayment split — $854 principal / $11,086 interest

The prototype states $9,140 principal and $2,800 interest of the $11,940 total.
That cannot hold: the CBA facility is interest-only at $6,250/month, so interest
alone is at least $6,250 — more than double the stated total interest.

The app stores the principal/interest split per facility as a recorded statement
fact and seeds each consistently with its own type and rate (IO = all interest).
The monthly total, $11,940, matches the prototype exactly.

*The $9,140 figure also appears in the Aug cash-outgoings footnote, where it is
retained as seeded posted-history data.*

### 3.5 Counts where the prototype shows more rows than it lists

| Filter | Prototype | App | Reason |
| --- | --- | --- | --- |
| Obligations "All" | 23 | 7 | 7 rows are shown; counts derive from records |
| Documents "All" | 142 | 5 | 5 rows are shown |
| Documents "Unlinked" | 2 | 1 | 1 unlinked row is shown |
| Entities "All" | 6 | 5 | 5 entities are shown |
| Leases "Active" | 7 | 6 | 6 leases are shown |
| Properties "All" | 5 | 5 | ✅ |

Counts are derived so they can never contradict the list beneath them. Seeding
the missing records would fabricate data; that is left for the real dataset.

### 3.6 "Due in next 14 days" — 2 items, $3,105

The prototype's tile says "7 items · $9,320" while the card beneath it lists four
obligations dated 14, 18, 22 and 30 September — a 24-day span, not 14.

The app uses one window for both, `UPCOMING_WINDOW_DAYS = 14`
(`src/shared/config/app-config.ts`), giving 2 items totalling $3,105 (insurance
$1,860 on 14 Sep, council rates $1,245 on 18 Sep). Changing that one constant to
`24` restores the prototype's four-row card.

### 3.7 Smaller derived differences

| Item | Prototype | App | Why |
| --- | --- | --- | --- |
| Compton Rd rent/month | $11,200 | $7,063 | Computed from the six room leases shown: (350+330+340+360)/wk + 500/fortnight, annualised ÷ 12 |
| A. Nguyen arrears age | "Partial · 4 days" | "Partial · 12 days" | The reconcile screen dates that charge 25 Aug; 6 Sep − 25 Aug = 12 |
| Cash outgoings delta | "–" (flat) | 3.5% | Aug $19,870 vs Jul $19,200 is a real +3.5%; the app shows it rather than suppressing it |
| Bank import table | 5 rows | 38 rows | The prototype showed a sample; the app lists the whole staged import |
| Obligations "Due this week" | 4 | 0 | 6 Sep + 7 days = 13 Sep; the next obligation is 14 Sep |

## 3.8 New screens added after the requirements document

Three screens exist in the app that the prototype does not contain, because the
requirements document specifies them as first-release scope:

| Screen | Requirement | Design approach |
| --- | --- | --- |
| `/shared-bills` | **FR-07** — an MVP requirement the prototype only hints at, via its "Water usage · shared bill" row and the audit entry "split changed 50/50 → 60/40" | Built entirely from existing design-system components: `KpiGrid`, `FilterGroup`, `DataTable`, the two-column `Grid` with a detail panel — the same layout as the obligations screen |
| `/expenses` | **FR-04** — expense records, the half of FR-04 the prototype does not show | Same pattern; the category breakdown reuses the ownership view's bar treatment |
| `/explain/[metric]` | **FR-09** — "drill-down must explain every total"; the prototype's "Explain this total" link was a placeholder | Hero KPI + reconciliation `Banner` + `DataTable`, all existing components |

No new CSS was written for any of them. Every element uses a class name already
present in the prototype's stylesheet, which is why the class-usage audit still
reports zero invented classes.

## 3.9 Chart anchoring corrected

The cash-flow chart originally anchored on the month containing the as-of date,
which appended an empty September bar — reading as a collapse in receipts rather
than as an unreconciled period. It now anchors on the latest *posted* month, so
it ends at August. This matches the prototype, which also shows Mar–Aug against a
6 September as-of date. Caught by `tests/uat-05-dashboard-fixtures.test.ts`.

## 4. Deliberate improvements

- **Real routing.** Each screen has a URL, so deep links, browser history and the
  back button work. The prototype swapped `display:none` and stored the last view
  in `localStorage`.
- **Keyboard-accessible table rows** where rows are selectable.
- **Self-hosted fonts** — no third-party request on page load.
- **Server-rendered chrome** — nav badges and the as-of date resolve before paint.
- **Chart tooltips** — `<title>` on each bar gives the month and exact amount.
- **Ownership gap detection generalised** — the prototype hard-coded one gap; the
  app detects both unallocated shares and undecided consolidation methods.
- **Every KPI label is a drill-down link** — the prototype had one placeholder
  "Explain this total"; the app links net worth, assets, liabilities, arrears and
  upcoming obligations to reconciled record lists.
- **Permissions are real** — the prototype's "Can see" column was descriptive
  text; it is now enforced server-side (NFR-01, UAT-04).

## 5. How to re-verify

```bash
# CSS parity
python3 - <<'PY'
orig=open('design/wealth-platform-design.html').read().split('<style>')[1].split('</style>')[0]
parts=[]
for f in ['tokens','base','shell','components','responsive']:
    lines=open(f'src/styles/{f}.css').read().split('\n')
    while lines and not lines[0].strip().endswith('*/'): lines.pop(0)
    lines.pop(0); parts.append('\n'.join(lines))
a=[l for l in orig.split('\n') if l.strip()]
b=[l for l in '\n'.join(parts).split('\n') if l.strip()]
print(len(a), len(b), a==b)
PY

# Every route renders
for p in dashboard obligations bank-import shared-bills expenses loans properties \
         leases entities documents access design-system explain/net-worth; do
  printf "%-24s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' localhost:3000/$p)"
done

# No invented CSS classes
npm test   # includes the requirements document's UAT-01…07 scenarios
```

> If new routes appear to 404, a stale `next-server` is probably still bound to
> port 3000. `pkill -f "next start"` does not match it — find it with
> `lsof -i :3000 -sTCP:LISTEN` and kill the PID.
