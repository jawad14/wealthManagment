# Module: documents

**Responsibility** — the document register: files, their versions and what they
are linked to. Covers FR-04.

**Key rules**
- **Nothing is destroyed.** `remove` sets `removedAt`/`removedBy` and hides the
  record; there is no hard delete.
- **Versions are additive.** An amended lease becomes version 2; the signed
  original is still there.
- **Assisted extraction is opt-in per document.** Nothing is sent to a model
  unless `aiExtractionApproved` is explicitly true.
- Unlinked documents are surfaced rather than filed somewhere plausible on the
  user's behalf.

**Owns** — `DocumentRecord`, `DocumentVersion`, `DocumentLink`.

**Depends on** — `access` (uploader names, audit trail). Link targets are stored
as ids and labels, so this module does not import the modules it links to.

**Depended on by** — `obligations` (evidence), `properties` (valuation backing).

**Not yet implemented** — file upload and storage, preview/open, version diffing,
the Release-2 assisted extraction pipeline.
