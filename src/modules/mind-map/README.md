# Module: mind-map

**Responsibility** — the orientation screen at `/mind-map`: how the records
connect, the order data must be entered in, what joins to what, and the joins
that do not exist.

**Reference data only.** Owns no aggregate and has no repository, service or
actions. It documents structure that lives in other modules.

**Key rules**
- **`ENTRY_STEPS` order is derived from the create actions, not chosen.** A
  property cannot be added without an owning entity; a lease cannot be added
  without a property. If a form's required fields change, this order is wrong
  until it is updated.
- **`required` lists what the action rejects the form without** — not every
  field on the screen. Optional fields belong in `note`.
- **The absent edges are load-bearing.** `MISSING_EDGES`, and the red edge on
  the diagram, are why the map is worth reading: they mark joins a user
  reasonably expects and will not find. Removing them to make the picture
  tidier would defeat the screen.
- **Diagram geometry is hand-placed.** The graph is small and fixed; the one
  crossing edge (Entities borrows on Loans) is routed around the left margin
  deliberately, because the borrower is not the owner and the picture must not
  imply it is.
- **Inline SVG, coloured only from CSS custom properties.** That is what makes
  it work in both themes without a second asset, and keeps the boxes as real
  links with selectable text.

**Owns** — `MapNode`, `MapEdge`, `EntryStep`, `Connection`, `MissingEdge`.

**Depends on** — `shared/components` only.

**Depended on by** — nothing.

**Keep in step with [`how-it-works`](../how-it-works/README.md).** Its
`KNOWN_GAPS` and this module's `MISSING_EDGES` describe the same absences; wiring
up loan CRUD or a `loanId` on `ExpenseAllocation` retires entries in both.
