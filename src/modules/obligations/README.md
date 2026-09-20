# Module: obligations

**Responsibility** — recurring and one-off obligations, their owners, evidence
and reminder schedules. Covers FR-03 and FR-08.

**Key rules**
- **Payment evidence closes an obligation; a sent reminder does not.** `paidOn`
  is only set alongside a document, so "we chased them" can never be mistaken for
  "it is paid".
- **No owner, no reminders.** An unowned obligation has nobody accountable, so
  the platform refuses to send and surfaces the gap instead of quietly doing
  nothing.
- **Status is derived, never stored.** A stored status drifts the moment a due
  date passes or evidence is attached.
- Reminders re-check paid/disputed status immediately before sending, and respect
  quiet hours.
- **Paying a recurring obligation schedules the next one.** The next due date
  steps from the *due* date (not the paid date) by 1, 3 or 12 months, and the new
  instance starts open with no evidence. A matching title + property + due date
  means it already exists, so recording the payment twice schedules once.

**Owns** — `Obligation`, `ReminderPolicy`, `ReminderEvent`, `Evidence`.

**Depends on** — `access` (owner names, audit trail), `properties` (context
labels, via the page).

**Depended on by** — `dashboard` (upcoming KPI, overdue attention item, sidebar
badge).

**Not yet implemented** — the scheduler that actually sends reminders, recurrence
expansion beyond the single next instance created on payment, escalation-to-task
creation, obligation CRUD.
