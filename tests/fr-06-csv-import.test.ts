/**
 * FR-06 — starting an import cycle from an uploaded or pasted CSV statement.
 *
 * Expected values are hand-derived from the statement text in each test and
 * from the seeded leases (166C-R3 is A. Nguyen's Room 3 lease, running
 * 1 Jun 2026 – 31 May 2027; 166C-R1-P ended 31 Jan 2026), not computed by the
 * service under test.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { reconciliationService } from '@/modules/reconciliation/service';
import { reconciliationRepository } from '@/modules/reconciliation/repository';
import { uploadBankCsvAction } from '@/modules/reconciliation/actions';
import {
  parseStatementAmount,
  parseStatementCsv,
  parseStatementDate,
} from '@/modules/reconciliation/csv-parser';
import { IMPORT_ID } from '@/modules/reconciliation/data/seed';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import { accessService } from '@/modules/access/service';
import { ConflictError, ValidationError } from '@/shared/lib/errors';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';

const ACTOR = USER_IDS.jawad;
const SEEDED_ROWS = 38;

function importCsv(csvContent: string, accountLabel = 'CBA Everyday Business') {
  return reconciliationService.createImportFromCsv({
    accountLabel,
    format: 'CSV',
    csvContent,
    actor: ACTOR,
    asOf: '2026-09-20',
  });
}

function fieldErrorsOf(work: () => unknown): Record<string, string[]> {
  try {
    work();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    return ((error as ValidationError).details as { fieldErrors: Record<string, string[]> }).fieldErrors;
  }
  throw new Error('Expected a ValidationError, but nothing was thrown.');
}

beforeEach(() => {
  reconciliationRepository.reset();
});

describe('FR-06 · CSV parsing', () => {
  it('reads the standard header into typed rows, in integer cents', () => {
    const rows = parseStatementCsv(
      [
        'Date,Amount,Description,Reference',
        '2026-09-10,480.00,Direct Credit WATSON-R2,WATSON-R2',
        '2026-09-11,-125.50,Council Rates Payment,RATES-4412',
      ].join('\n'),
    );

    expect(rows).toEqual([
      {
        line: 2,
        date: '2026-09-10',
        amount: { cents: 48_000, currency: 'AUD' },
        description: 'Direct Credit WATSON-R2',
        reference: 'WATSON-R2',
      },
      {
        line: 3,
        date: '2026-09-11',
        amount: { cents: -12_550, currency: 'AUD' },
        description: 'Council Rates Payment',
        reference: 'RATES-4412',
      },
    ]);
  });

  it('handles quotes, embedded commas, doubled quotes, CRLF, a BOM and blank lines', () => {
    const rows = parseStatementCsv(
      '﻿Date,Amount,Description,Reference\r\n' +
        '2026-09-10,"$1,860.00","SMITH, J ""RENT"" PAYMENT",REF-1\r\n' +
        '\r\n' +
        '2026-09-12,"-2,000.00",Plumber,\r\n',
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.amount.cents).toBe(186_000);
    expect(rows[0]?.description).toBe('SMITH, J "RENT" PAYMENT');
    expect(rows[1]?.amount.cents).toBe(-200_000);
    // An empty reference is absent, not an empty string.
    expect(rows[1]).not.toHaveProperty('reference');
  });

  it('matches headers by name, in any order and case, with Reference optional', () => {
    const rows = parseStatementCsv('description,AMOUNT,date\nWater bill,-88.10,2026-09-02');

    expect(rows).toEqual([
      { line: 2, date: '2026-09-02', amount: { cents: -8_810, currency: 'AUD' }, description: 'Water bill' },
    ]);
  });

  it('parses amounts without floating point', () => {
    expect(parseStatementAmount('480.00')?.cents).toBe(48_000);
    expect(parseStatementAmount('-125.50')?.cents).toBe(-12_550);
    expect(parseStatementAmount('$1,860.00')?.cents).toBe(186_000);
    expect(parseStatementAmount('-$1,860')?.cents).toBe(-186_000);
    expect(parseStatementAmount('+300')?.cents).toBe(30_000);
    expect(parseStatementAmount('(125.50)')?.cents).toBe(-12_550);
    expect(parseStatementAmount('−412.5')?.cents).toBe(-41_250);
    // 1.15 * 100 is 114.99999999999999 in binary floating point.
    expect(parseStatementAmount('1.15')?.cents).toBe(115);
    expect(parseStatementAmount('0.00')?.cents).toBe(0);
  });

  it('rejects amounts it cannot read rather than coercing them to zero', () => {
    ['', 'abc', '12.345', '1,86.00', '1.2.3', '--5', '$'].forEach((raw) => {
      expect(parseStatementAmount(raw), raw).toBeNull();
    });
  });

  it('parses ISO and day-first dates into IsoDate', () => {
    expect(parseStatementDate('2026-09-10')).toBe('2026-09-10');
    expect(parseStatementDate('2026/9/3')).toBe('2026-09-03');
    expect(parseStatementDate('10/09/2026')).toBe('2026-09-10');
    expect(parseStatementDate('3-9-2026')).toBe('2026-09-03');
    expect(parseStatementDate('03.09.2026')).toBe('2026-09-03');
  });

  it('rejects dates that are not on the calendar', () => {
    ['2026-02-30', '31/04/2026', '2026-13-01', '10 Sep 2026', '10/09/26', ''].forEach((raw) => {
      expect(parseStatementDate(raw), raw).toBeNull();
    });
  });

  it('rejects the whole file and names each bad line', () => {
    const errors = fieldErrorsOf(() =>
      parseStatementCsv(
        ['Date,Amount,Description,Reference', '2026-09-10,480.00,Fine,OK-1', '2026-02-30,abc,,X'].join('\n'),
      ),
    );

    expect(errors.csvContent).toEqual([
      'Line 3: "2026-02-30" is not a date. Use YYYY-MM-DD or DD/MM/YYYY.',
      'Line 3: "abc" is not an amount.',
      'Line 3: the description is blank.',
    ]);
  });

  it('rejects an empty statement, a missing column, a header-only file and an unclosed quote', () => {
    expect(fieldErrorsOf(() => parseStatementCsv('  \n ')).csvContent).toEqual(['The statement is empty.']);
    expect(fieldErrorsOf(() => parseStatementCsv('Date,Description\n2026-09-10,x')).csvContent).toEqual([
      'Missing column: amount.',
    ]);
    expect(() => parseStatementCsv('Date,Amount,Description,Reference\n')).toThrow(/no transactions/);
    expect(() => parseStatementCsv('Date,Amount,Description\n2026-09-10,1.00,"open')).toThrow(/never closed/);
  });
});

describe('FR-06 · creating an import from CSV', () => {
  const STATEMENT = [
    'Date,Amount,Description,Reference',
    '2026-09-08,500.00,NGUYEN A RENT RM3,166C-R3',
    '2026-09-09,330.00,Direct credit CHEN M,',
    '2026-09-10,-412.00,PLUMBER 166 COMPTON RD,INV-2291',
    '2026-09-11,-125.50,Council Rates Payment,RATES-4412',
  ].join('\n');

  it('creates the import, stages every row and makes it the current import', () => {
    const created = importCsv(STATEMENT);

    expect(created).toMatchObject({
      accountLabel: 'CBA Everyday Business',
      importedOn: '2026-09-20',
      periodFrom: '2026-09-08',
      periodTo: '2026-09-11',
      format: 'CSV',
      stage: 'match',
      duplicatesSkipped: 0,
    });
    expect(created).not.toHaveProperty('duplicatesSkippedFromDate');
    expect(created.id).not.toBe(IMPORT_ID);

    expect(reconciliationService.currentImport()?.id).toBe(created.id);
    expect(reconciliationService.listTransactions(created.id)).toHaveLength(4);
    // The earlier import is untouched.
    expect(reconciliationService.listTransactions(IMPORT_ID)).toHaveLength(SEEDED_ROWS);
  });

  it('suggests 0.9 on a billing reference, 0.6 on a name, and nothing otherwise', () => {
    const created = importCsv(STATEMENT);
    const byDate = new Map(reconciliationService.listTransactions(created.id).map((txn) => [txn.date, txn]));

    const byReference = byDate.get('2026-09-08');
    expect(byReference?.suggestion).toMatchObject({
      kind: 'rent',
      label: 'Rent · A. Nguyen · 166 Compton Rd · Room 3',
      confidence: 0.9,
      targetRef: '166C-R3',
      propertyId: PROPERTY_IDS.comptonRd,
    });
    expect(byReference?.state).toBe('auto-matched');

    const byTenantName = byDate.get('2026-09-09');
    expect(byTenantName?.suggestion).toMatchObject({
      kind: 'rent',
      label: 'Rent · M. Chen · 166 Compton Rd · Room 2',
      confidence: 0.6,
      targetRef: '166C-R2',
    });

    const byPropertyName = byDate.get('2026-09-10');
    expect(byPropertyName?.suggestion).toMatchObject({
      kind: 'expense',
      label: 'Property expense · 166 Compton Rd, Woodridge',
      confidence: 0.6,
      propertyId: PROPERTY_IDS.comptonRd,
    });

    const unmatched = byDate.get('2026-09-11');
    expect(unmatched?.suggestion).toBeNull();
    expect(unmatched?.state).toBe('unmatched');

    expect(reconciliationService.summarise(created.id)).toMatchObject({
      staged: 4,
      autoMatched: 3,
      needsReview: 0,
      unmatched: 1,
      unmatchedValue: { cents: 12_550 },
    });
  });

  it('keeps the raw bank text verbatim and confirms nothing on its own', () => {
    const created = importCsv(STATEMENT);
    const rows = reconciliationService.listTransactions(created.id);

    expect(rows.find((txn) => txn.date === '2026-09-08')).toMatchObject({
      rawDescription: 'NGUYEN A RENT RM3',
      rawReference: '166C-R3',
      amount: { cents: 50_000, currency: 'AUD' },
    });
    expect(rows.every((txn) => txn.state !== 'confirmed' && !txn.confirmedBy && !txn.postedAt)).toBe(true);
    expect(reconciliationService.readyToPostCount(created.id)).toBe(0);
  });

  it('does not let an ended lease, or a longer reference, claim a receipt', () => {
    const created = importCsv(
      [
        'Date,Amount,Description,Reference',
        // 166C-R1-P ended 31 Jan 2026, and must not be read as the live 166C-R1.
        '2026-09-08,350.00,Transfer,166C-R1-P',
        // A refund going out is not rent, whatever reference it quotes.
        '2026-09-09,-500.00,Refund,166C-R3',
      ].join('\n'),
    );

    reconciliationService.listTransactions(created.id).forEach((txn) => {
      expect(txn.suggestion, txn.rawReference).toBeNull();
      expect(txn.state).toBe('unmatched');
    });
  });

  it('skips rows already staged, matching on date, amount and reference', () => {
    const created = importCsv(
      [
        'Date,Amount,Description,Reference',
        // Seeded: 28 Aug, $300.00, "Ref 166C-R3".
        '28/08/2026,300.00,NGUYEN A RENT RM3,166C-R3',
        // Seeded: 27 Aug, −$412.00, "Direct debit".
        '2026-08-27,-412.00,Urban Utilities,Direct debit',
        // Same date and reference as the first, different amount — not a duplicate.
        '2026-08-28,200.00,NGUYEN A RENT RM3,166C-R3',
      ].join('\n'),
    );

    expect(created.duplicatesSkipped).toBe(2);
    // The seeded import they were first staged by was imported on 4 Sep.
    expect(created.duplicatesSkippedFromDate).toBe('2026-09-04');
    expect(created.stage).toBe('match');
    expect(created.periodFrom).toBe('2026-08-27');

    const rows = reconciliationService.listTransactions(created.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount.cents).toBe(20_000);
  });

  it('treats a re-upload of the same statement as a conflict and stages nothing', () => {
    importCsv(STATEMENT);
    const importsBefore = reconciliationRepository.listImports().length;
    const rowsBefore = reconciliationRepository.listAllTransactions().length;

    expect(() => importCsv(STATEMENT)).toThrow(ConflictError);
    expect(() => importCsv(STATEMENT)).toThrow(/4 duplicates skipped/);

    expect(reconciliationRepository.listImports()).toHaveLength(importsBefore);
    expect(reconciliationRepository.listAllTransactions()).toHaveLength(rowsBefore);
  });

  it('rejects a bad statement without creating anything', () => {
    expect(() => importCsv('Date,Amount,Description\n2026-09-10,abc,Oops')).toThrow(ValidationError);
    expect(fieldErrorsOf(() => importCsv(STATEMENT, '   ')).accountLabel).toBeDefined();
    expect(
      fieldErrorsOf(() =>
        reconciliationService.createImportFromCsv({
          accountLabel: 'CBA',
          format: 'OFX',
          csvContent: STATEMENT,
          actor: ACTOR,
        }),
      ).format,
    ).toBeDefined();

    expect(reconciliationRepository.listImports()).toHaveLength(1);
    expect(reconciliationRepository.listAllTransactions()).toHaveLength(SEEDED_ROWS);
  });

  it('records the import in the audit trail', () => {
    importCsv(STATEMENT);

    const entry = accessService.listAuditEvents().find((event) => event.summary.startsWith('Bank statement imported'));
    expect(entry?.summary).toBe('Bank statement imported · 4 rows staged');
    expect(entry?.context).toBe(
      'CBA Everyday Business · 2026-09-08 to 2026-09-11 · 3 suggested · 1 unmatched · 0 duplicates skipped',
    );
  });

  it('can be reviewed and posted like any other import', () => {
    const created = importCsv(STATEMENT);

    expect(reconciliationService.confirmAllHighConfidence(created.id, ACTOR)).toBe(3);
    const posted = reconciliationService.postToLedger(created.id, ACTOR);

    expect(posted.stage).toBe('posted');
    // No September month is seeded. Receipts 500 + 330; outgoings 412; the
    // unmatched $125.50 stays out.
    const september = reconciliationRepository.findPostedCashFlow('2026-09-01');
    expect(september?.receipts.cents).toBe(83_000);
    expect(september?.outgoings.cents).toBe(41_200);
  });
});

describe('FR-06 · uploadBankCsvAction', () => {
  const run = (form: FormData) => uploadBankCsvAction(IDLE_RESULT as ActionResult<unknown>, form);

  it('imports pasted text', async () => {
    const form = new FormData();
    form.set('accountLabel', 'CBA Everyday Business');
    form.set('csvContent', 'Date,Amount,Description,Reference\n2026-09-10,480.00,Direct Credit WATSON-R2,WATSON-R2');

    const result = await run(form);

    expect(result).toMatchObject({ ok: true, message: 'Statement imported · 1 row staged' });
    expect(reconciliationService.currentImport()?.accountLabel).toBe('CBA Everyday Business');
  });

  it('prefers an uploaded file over the text box', async () => {
    const form = new FormData();
    form.set('accountLabel', 'NAB Business');
    form.set('csvContent', 'this is not a statement');
    form.set(
      'csvFile',
      new File(['Date,Amount,Description\n2026-09-10,10.00,One\n2026-09-11,20.00,Two'], 'statement.csv', {
        type: 'text/csv',
      }),
    );

    const result = await run(form);

    expect(result).toMatchObject({ ok: true, message: 'Statement imported · 2 rows staged' });
  });

  it('returns field errors instead of throwing', async () => {
    const empty = new FormData();
    empty.set('accountLabel', 'CBA');
    const nothing = await run(empty);
    expect(nothing.ok).toBe(false);
    expect(nothing.ok ? undefined : nothing.fieldErrors?.csvContent).toEqual(['Nothing to import yet.']);

    const bad = new FormData();
    bad.set('accountLabel', 'CBA');
    bad.set('csvContent', 'Date,Amount,Description\nyesterday,5.00,Coffee');
    const result = await run(bad);
    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.fieldErrors?.csvContent?.[0]).toMatch(/^Line 2: "yesterday" is not a date/);
    expect(reconciliationRepository.listImports()).toHaveLength(1);
  });
});
