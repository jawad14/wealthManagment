/**
 * FR-04 — document versions.
 *
 * A renewed policy or revised lease is a new version on the same record. The
 * earlier versions stay in the history exactly as they were uploaded.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { addDocumentVersionAction } from '@/modules/documents/actions';
import { documentsService } from '@/modules/documents/service';
import { accessService } from '@/modules/access/service';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';

describe('FR-04 · adding a document version', () => {
  it('appends a new version from the form, leaving earlier versions intact', async () => {
    const before = documentsService.list()[0]?.record;
    if (!before) throw new Error('Expected seeded documents');
    const startedAt = new Date().toISOString();

    // Field values exactly as the "New version" form submits them.
    const form = new FormData();
    form.append('documentId', before.id);
    form.append('note', '2026-2027 Policy Renewal');
    form.append('sizeMb', '1.2');

    const result = await addDocumentVersionAction(IDLE_RESULT as ActionResult<unknown>, form);
    expect(result.ok).toBe(true);

    const after = documentsService.require(before.id);
    expect(after.versions).toHaveLength(before.versions.length + 1);

    const latest = after.versions[after.versions.length - 1];
    expect(latest?.version).toBe(before.versions.length + 1);
    expect(latest?.note).toBe('2026-2027 Policy Renewal');
    expect(latest?.sizeBytes).toBe(1_200_000);
    expect(latest?.uploadedBy).toBe(accessService.getCurrentUser().id);
    expect(latest && latest.uploadedAt >= startedAt).toBe(true);

    // Every earlier version is still there, unchanged.
    expect(after.versions.slice(0, before.versions.length)).toEqual(before.versions);

    const view = documentsService.view(after);
    expect(view.versionCount).toBe(before.versions.length + 1);
    expect(view.latestVersionNote).toBe('2026-2027 Policy Renewal');
    expect(view.sizeLabel).toBe('1.2 MB');
  });

  it('carries the current size forward when no size is given', async () => {
    const before = documentsService.list()[1]?.record;
    if (!before) throw new Error('Expected seeded documents');

    const form = new FormData();
    form.append('documentId', before.id);

    const result = await addDocumentVersionAction(IDLE_RESULT as ActionResult<unknown>, form);
    expect(result.ok).toBe(true);

    const after = documentsService.require(before.id);
    const latest = after.versions[after.versions.length - 1];
    expect(latest?.sizeBytes).toBe(before.versions[before.versions.length - 1]?.sizeBytes);
    expect(latest?.note).toBeUndefined();
  });

  it('rejects a zero size and an unknown document without throwing', async () => {
    const target = documentsService.list()[2]?.record;
    if (!target) throw new Error('Expected seeded documents');

    const zero = new FormData();
    zero.append('documentId', target.id);
    zero.append('sizeMb', '0');
    const zeroResult = await addDocumentVersionAction(IDLE_RESULT as ActionResult<unknown>, zero);
    expect(zeroResult.ok).toBe(false);
    expect(documentsService.require(target.id).versions).toHaveLength(target.versions.length);

    const missing = new FormData();
    missing.append('documentId', 'doc-does-not-exist');
    const missingResult = await addDocumentVersionAction(IDLE_RESULT as ActionResult<unknown>, missing);
    expect(missingResult.ok).toBe(false);
  });
});
