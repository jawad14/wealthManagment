/**
 * Bank statement CSV parsing (FR-06).
 *
 * Turns pasted or uploaded statement text into typed rows at the boundary, so
 * the service never sees a raw string for a date or an amount. Amounts are read
 * digit by digit into integer cents — no floating point touches them.
 */
import { ValidationError } from '@/shared/lib/errors';
import { money, type Money } from '@/shared/lib/money';
import { toDate, toIsoDate } from '@/shared/lib/dates';
import type { IsoDate } from '@/shared/types/common';

export interface ParsedStatementRow {
  /** 1-based line in the source text, for error messages. */
  readonly line: number;
  readonly date: IsoDate;
  /** Signed: positive is a receipt, negative an outgoing. */
  readonly amount: Money;
  /** Raw bank narration, verbatim. */
  readonly description: string;
  readonly reference?: string;
}

/** Statements are monthly; anything far beyond that is almost certainly the wrong file. */
export const MAX_STATEMENT_ROWS = 2_000;

/** How many row errors are reported at once — enough to see a pattern, not a wall. */
const MAX_REPORTED_ERRORS = 5;

const REQUIRED_HEADERS = ['date', 'amount', 'description'] as const;

/**
 * Split CSV text into records of fields (RFC 4180): quoted fields may contain
 * commas, line breaks and doubled quotes. Each record keeps the line it began on.
 */
export function splitCsv(text: string): readonly { readonly line: number; readonly fields: readonly string[] }[] {
  const records: { line: number; fields: string[] }[] = [];
  const source = text.replace(/^﻿/, '');

  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  const endRecord = (): void => {
    fields.push(field);
    // A line with nothing on it is spacing, not a record.
    if (fields.some((value) => value.trim() !== '')) records.push({ line: recordLine, fields });
    fields = [];
    field = '';
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === '\n') line += 1;
        field += char;
      }
    } else if (char === '"' && field.trim() === '') {
      field = '';
      quoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      endRecord();
      line += 1;
      recordLine = line;
    } else {
      field += char;
    }
  }

  if (quoted) {
    throw new ValidationError('The CSV has a quoted value that is never closed.', {
      fieldErrors: { csvContent: [`A quote opened on line ${recordLine} is never closed.`] },
    });
  }
  endRecord();
  return records;
}

/**
 * Parse a statement amount into signed integer cents.
 *
 * Accepts what banks export — "480.00", "-125.50", "$1,860.00", "+300",
 * "(125.50)" and the typographic minus — and returns null for anything else
 * rather than coercing it to zero.
 */
export function parseStatementAmount(raw: string): Money | null {
  let text = raw.trim().replace(/−/g, '-');
  let negative = false;

  // Accounting notation: (125.50) is an outgoing.
  const bracketed = /^\((.*)\)$/.exec(text);
  if (bracketed) {
    negative = true;
    text = bracketed[1] ?? '';
  }

  text = text.replace(/[$\s]|AUD/gi, '');
  if (text.startsWith('-')) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }

  const match = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;

  const dollars = Number((match[1] ?? '').replace(/,/g, ''));
  const cents = dollars * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return money(negative && cents !== 0 ? -cents : cents);
}

/**
 * Parse a statement date into an `IsoDate`.
 *
 * Accepts YYYY-MM-DD (or YYYY/MM/DD) and the Australian day-first forms
 * DD/MM/YYYY, DD-MM-YYYY and DD.MM.YYYY. A date that does not exist on the
 * calendar (30 Feb) is rejected rather than rolled into March.
 */
export function parseStatementDate(raw: string): IsoDate | null {
  const text = raw.trim();
  const isoForm = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text);
  const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);

  const parts = isoForm
    ? { year: isoForm[1], month: isoForm[2], day: isoForm[3] }
    : dayFirst
      ? { year: dayFirst[3], month: dayFirst[2], day: dayFirst[1] }
      : null;
  if (!parts?.year || !parts.month || !parts.day) return null;

  const candidate = `${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}`;
  try {
    return toIsoDate(toDate(candidate)) === candidate ? candidate : null;
  } catch {
    return null;
  }
}

function invalidCsv(message: string, errors: readonly string[]): ValidationError {
  return new ValidationError(message, { fieldErrors: { csvContent: errors } });
}

/**
 * Parse a whole statement. Headers are matched by name, in any order and any
 * case; `Reference` is optional. One bad row rejects the file — importing half
 * a statement would leave the period looking reconciled when it is not.
 */
export function parseStatementCsv(text: string): readonly ParsedStatementRow[] {
  const [header, ...records] = splitCsv(text);
  if (!header) {
    throw invalidCsv('Paste or upload a CSV statement to import.', ['The statement is empty.']);
  }

  const columns = header.fields.map((name) => name.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((name) => !columns.includes(name));
  if (missing.length > 0) {
    throw invalidCsv('The first line must be the header row: Date, Amount, Description, Reference.', [
      `Missing column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`,
    ]);
  }
  if (records.length === 0) {
    throw invalidCsv('The statement has a header but no transactions.', ['Add at least one row under the header.']);
  }
  if (records.length > MAX_STATEMENT_ROWS) {
    throw invalidCsv(`A statement can have at most ${MAX_STATEMENT_ROWS.toLocaleString('en-AU')} rows.`, [
      `This file has ${records.length.toLocaleString('en-AU')} rows. Split it by month and import each part.`,
    ]);
  }

  const dateAt = columns.indexOf('date');
  const amountAt = columns.indexOf('amount');
  const descriptionAt = columns.indexOf('description');
  const referenceAt = columns.indexOf('reference');

  const errors: string[] = [];
  const rows: ParsedStatementRow[] = [];

  records.forEach(({ line, fields }) => {
    const rawDate = fields[dateAt] ?? '';
    const rawAmount = fields[amountAt] ?? '';
    const description = (fields[descriptionAt] ?? '').trim();
    const reference = referenceAt >= 0 ? (fields[referenceAt] ?? '').trim() : '';

    const date = parseStatementDate(rawDate);
    const amount = parseStatementAmount(rawAmount);

    if (!date) errors.push(`Line ${line}: "${rawDate.trim()}" is not a date. Use YYYY-MM-DD or DD/MM/YYYY.`);
    if (!amount) errors.push(`Line ${line}: "${rawAmount.trim()}" is not an amount.`);
    if (!description) errors.push(`Line ${line}: the description is blank.`);
    if (!date || !amount || !description) return;

    rows.push({ line, date, amount, description, ...(reference ? { reference } : {}) });
  });

  if (errors.length > 0) {
    const shown = errors.slice(0, MAX_REPORTED_ERRORS);
    if (errors.length > shown.length) shown.push(`…and ${errors.length - shown.length} more.`);
    throw invalidCsv(
      `The statement could not be read · ${errors.length} problem${errors.length === 1 ? '' : 's'} found. Nothing was imported.`,
      shown,
    );
  }
  return rows;
}
