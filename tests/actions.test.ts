/**
 * Server Actions — the write paths behind every wired button.
 *
 * Actions are called directly with a FormData, so this covers the part that the
 * service tests do not: parsing untyped form input, and turning a domain error
 * into a message a form can display rather than an exception.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Actions call revalidatePath, which needs a request scope that does not exist
// in a unit test. The cache behaviour is Next's; what matters here is the write.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createObligationAction, markDisputedAction, recordPaymentAction } from '@/modules/obligations/actions';
import { confirmTransactionAction, leaveUnmatchedAction } from '@/modules/reconciliation/actions';
import { createExpenseAction, voidExpenseAction } from '@/modules/expenses/actions';
import { createLeaseAction, terminateLeaseAction } from '@/modules/leases/actions';
import { createEntityAction, createRelationshipAction } from '@/modules/entities/actions';
import { inviteAction } from '@/modules/access/actions';
import { obligationsRepository } from '@/modules/obligations/repository';
import { leasesRepository } from '@/modules/leases/repository';
import { expensesRepository } from '@/modules/expenses/repository';
import { reconciliationRepository } from '@/modules/reconciliation/repository';
import { OBLIGATION_IDS } from '@/modules/obligations/data/seed';
import { ENTITY_IDS, PROPERTY_IDS } from '@/modules/entities/data/seed';
import { COMPONENT_IDS } from '@/modules/properties/data/seed';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';

const idle = IDLE_RESULT as ActionResult<unknown>;

/** Build a FormData the way a browser would. */
function formOf(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

beforeEach(() => {
  obligationsRepository.reset();
  leasesRepository.reset();
});

describe('obligations actions', () => {
  it('creates an obligation from form input', async () => {
    const before = obligationsRepository.list().length;
    const result = await createObligationAction(
      idle,
      formOf({ title: 'Gutter clean', dueOn: '2026-10-01', amount: '$1,250.00', recurrence: 'yearly' }),
    );

    expect(result.ok).toBe(true);
    expect(obligationsRepository.list().length).toBe(before + 1);

    const created = obligationsRepository.list().find((o) => o.title === 'Gutter clean');
    // "$1,250.00" must survive as 125000 cents, not NaN or 1.
    expect(created?.amount?.cents).toBe(125_000);
    // No owner given, so it must not be validated for reminders.
    expect(created?.ownerUserId).toBeNull();
    expect(created?.validatedAt).toBeUndefined();
  });

  it('rejects a missing title with a message instead of throwing', async () => {
    const result = await createObligationAction(idle, formOf({ dueOn: '2026-10-01' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/Title is required/i);
  });

  it('refuses to close an obligation without evidence, and names the field', async () => {
    const result = await recordPaymentAction(
      idle,
      formOf({ obligationId: OBLIGATION_IDS.councilRates, paidOn: '2026-09-08' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.documentId?.[0]).toMatch(/evidence is required/i);
    }
    // Still open.
    expect(obligationsRepository.find(OBLIGATION_IDS.councilRates)?.paidOn).toBeUndefined();
  });

  it('closes an obligation when evidence is supplied', async () => {
    const result = await recordPaymentAction(
      idle,
      formOf({
        obligationId: OBLIGATION_IDS.councilRates,
        paidOn: '2026-09-08',
        documentId: 'doc-urban-utilities',
      }),
    );

    expect(result.ok).toBe(true);
    expect(obligationsRepository.find(OBLIGATION_IDS.councilRates)?.paidOn).toBe('2026-09-08');
  });

  it('marks an obligation disputed', async () => {
    const result = await markDisputedAction(idle, formOf({ obligationId: OBLIGATION_IDS.councilRates }));
    expect(result.ok).toBe(true);
    expect(obligationsRepository.find(OBLIGATION_IDS.councilRates)?.disputed).toBe(true);
  });
});

describe('reconciliation actions', () => {
  it('persists a confirmation', async () => {
    const result = await confirmTransactionAction(idle, formOf({ transactionId: 'txn-urban-utilities-0827' }));

    expect(result.ok).toBe(true);
    const txn = reconciliationRepository.findTransaction('txn-urban-utilities-0827' as never);
    expect(txn?.state).toBe('confirmed');
    expect(txn?.confirmedBy).toBeTruthy();
    // The raw bank text is never rewritten.
    expect(txn?.rawDescription).toBe('URBAN UTILITIES 4471');
  });

  it('records a row deliberately left unmatched', async () => {
    const result = await leaveUnmatchedAction(idle, formOf({ transactionId: 'txn-bunnings-0822' }));
    expect(result.ok).toBe(true);
    expect(reconciliationRepository.findTransaction('txn-bunnings-0822' as never)?.state).toBe('unmatched');
  });
});

describe('expenses actions', () => {
  it('creates an expense and parses a formatted amount', async () => {
    const result = await createExpenseAction(
      idle,
      formOf({
        description: 'Roof repair',
        amount: '1,450.00',
        category: 'repairs',
        effectiveOn: '2026-09-01',
        entityId: ENTITY_IDS.familyTrust,
      }),
    );

    expect(result.ok).toBe(true);
    const created = expensesRepository.list().find((e) => e.revisions[0]?.description === 'Roof repair');
    expect(created?.revisions[0]?.amount.cents).toBe(145_000);
  });

  it('refuses a void without a reason', async () => {
    const result = await voidExpenseAction(idle, formOf({ expenseId: 'exp-insurance-benton' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/Reason is required/i);
  });
});

describe('leases actions', () => {
  it('creates a lease and generates its charge schedule in the same step', async () => {
    const result = await createLeaseAction(
      idle,
      formOf({
        tenantName: 'J. Fielding',
        propertyId: PROPERTY_IDS.comptonRd,
        componentId: COMPONENT_IDS.comptonRoom6,
        reference: '166C-R6',
        startsOn: '2026-09-15',
        endsOn: '2027-09-14',
        rent: '340.00',
        frequency: 'weekly',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message).toMatch(/53 expected charges/);

    const lease = leasesRepository.list().find((l) => l.reference === '166C-R6');
    expect(lease).toBeDefined();
    expect(leasesRepository.listCharges(lease!.id).length).toBe(53);
  });

  it('rejects an end date before the start date, naming the field', async () => {
    const result = await createLeaseAction(
      idle,
      formOf({
        tenantName: 'X', propertyId: PROPERTY_IDS.comptonRd, reference: 'X-1',
        startsOn: '2027-01-01', endsOn: '2026-01-01', rent: '300',
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.endsOn?.[0]).toMatch(/after the start date/i);
  });

  it('reports how many charges a termination removed and kept', async () => {
    const created = await createLeaseAction(
      idle,
      formOf({
        tenantName: 'K. Short', propertyId: PROPERTY_IDS.comptonRd, reference: 'TERM-1',
        startsOn: '2026-09-15', endsOn: '2027-09-14', rent: '340', frequency: 'weekly',
      }),
    );
    expect(created.ok).toBe(true);
    const lease = leasesRepository.list().find((l) => l.reference === 'TERM-1')!;

    const result = await terminateLeaseAction(
      idle,
      formOf({ leaseId: lease.id, endsOn: '2026-12-31', reason: 'Tenant relocating' }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message).toMatch(/unearned charges? removed/);
    expect(leasesRepository.listCharges(lease.id).every((c) => c.dueOn <= '2026-12-31')).toBe(true);
  });
});

describe('entities actions', () => {
  it('creates an entity', async () => {
    const result = await createEntityAction(idle, formOf({ name: 'Northgate Holdings Pty Ltd', kind: 'company' }));
    expect(result.ok).toBe(true);
  });

  it('refuses an ownership share on a control relationship (BR-02)', async () => {
    const result = await createRelationshipAction(
      idle,
      formOf({
        subjectEntityId: ENTITY_IDS.jawad,
        kind: 'beneficiary-of',
        targetEntityId: ENTITY_IDS.familyTrust,
        sharePercent: '50',
        from: '2026-01-01',
        label: 'Beneficiary with an invented share',
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/BR-02/);
  });

  it('requires a share on an ownership relationship', async () => {
    const result = await createRelationshipAction(
      idle,
      formOf({
        subjectEntityId: ENTITY_IDS.jawad,
        kind: 'owns',
        targetPropertyId: PROPERTY_IDS.miansRd,
        from: '2026-01-01',
        label: 'Owns · Mians Rd',
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.sharePercent).toBeDefined();
  });
});

describe('access actions', () => {
  it('requires an expiry date for an external read-only grant (NFR-01)', async () => {
    const result = await inviteAction(
      idle,
      formOf({ name: 'B. Reviewer', email: 'b@example.com', role: 'accountant-readonly' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.expiresOn?.[0]).toMatch(/expiry/i);
  });

  it('rejects a malformed email', async () => {
    const result = await inviteAction(
      idle,
      formOf({ name: 'B. Reviewer', email: 'not-an-email', role: 'family-contributor' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.email).toBeDefined();
  });

  it('creates a restricted grant by default', async () => {
    const result = await inviteAction(
      idle,
      formOf({ name: 'C. Delegate', email: 'c@example.com', role: 'operations-delegate' }),
    );
    expect(result.ok).toBe(true);
  });
});
