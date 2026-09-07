/**
 * Seeded bank import and staged transactions.
 *
 * The five rows the prototype shows in detail are declared explicitly. The
 * remaining rows of the 38-row statement are generated as routine traffic so the
 * import summary (38 staged · 31 auto-matched · 3 needs review · 4 unmatched,
 * $3,120 unallocated) is derived from real records rather than hard-coded.
 */
import { asId, type BankImportId, type BankTransactionId } from '@/shared/types/common';
import { fromMajorUnits } from '@/shared/lib/money';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import type { BankImport, StagedTransaction } from '../model';

export const IMPORT_ID: BankImportId = asId<'BankImport'>('imp-cba-2026-09-04');

export function seedBankImports(): readonly BankImport[] {
  return [
    {
      id: IMPORT_ID,
      accountLabel: 'CBA Everyday',
      importedOn: '2026-09-04',
      periodFrom: '2026-08-01',
      periodTo: '2026-08-31',
      format: 'CSV',
      stage: 'match',
      duplicatesSkipped: 3,
      duplicatesSkippedFromDate: '2026-08-21',
    },
  ];
}

/** The rows the design shows in full. */
function featuredTransactions(): StagedTransaction[] {
  return [
    {
      id: asId<'BankTransaction'>('txn-nguyen-rent-0828'),
      importId: IMPORT_ID,
      date: '2026-08-28',
      rawDescription: 'NGUYEN A RENT RM3',
      rawReference: 'Ref 166C-R3',
      amount: fromMajorUnits(300),
      suggestion: {
        kind: 'rent',
        label: 'Rent · A. Nguyen · Room 3 · charge 25 Aug ($500)',
        detail: 'Partial payment · $200 remains',
        confidence: 0.94,
        targetRef: 'chg-nguyen-0825',
        propertyId: PROPERTY_IDS.comptonRd,
      },
      state: 'auto-matched',
    },
    {
      id: asId<'BankTransaction'>('txn-urban-utilities-0827'),
      importId: IMPORT_ID,
      date: '2026-08-27',
      rawDescription: 'URBAN UTILITIES 4471',
      rawReference: 'Direct debit',
      amount: fromMajorUnits(-412),
      suggestion: {
        kind: 'expense',
        label: 'Water usage · 166 Compton Rd',
        detail: 'Split 60/40 to Rooms 1–3 and 4–6 per agreement',
        confidence: 0.88,
        targetRef: 'obl-water-usage',
        propertyId: PROPERTY_IDS.comptonRd,
      },
      state: 'auto-matched',
    },
    {
      id: asId<'BankTransaction'>('txn-transfer-0826'),
      importId: IMPORT_ID,
      date: '2026-08-26',
      rawDescription: 'TRANSFER TO 06-2233',
      rawReference: 'Own account',
      amount: fromMajorUnits(-5_000),
      suggestion: {
        kind: 'transfer',
        label: 'Internal transfer · Esteem Dev offset',
        detail: 'Excluded from income and expenses',
        confidence: 0.97,
        excludedFromCashFlow: true,
      },
      state: 'auto-matched',
    },
    {
      id: asId<'BankTransaction'>('txn-bunnings-0822'),
      importId: IMPORT_ID,
      date: '2026-08-22',
      rawDescription: 'BUNNINGS 2211 OXLEY',
      rawReference: 'Card',
      amount: fromMajorUnits(-286.4),
      suggestion: {
        kind: 'expense',
        label: 'Repairs & maintenance · property?',
        detail: 'Could not determine property',
        confidence: 0.41,
      },
      state: 'needs-review',
    },
    {
      id: asId<'BankTransaction'>('txn-deposit-0819'),
      importId: IMPORT_ID,
      date: '2026-08-19',
      rawDescription: 'DEPOSIT 1849',
      rawReference: 'Cash deposit',
      amount: fromMajorUnits(1_200),
      suggestion: null,
      state: 'unmatched',
    },
  ];
}

/**
 * The rest of the statement: routine rent receipts and direct debits that the
 * matcher resolved confidently, plus the remaining low-confidence and
 * unallocated rows that make up the import summary.
 */
function routineTransactions(): StagedTransaction[] {
  const rows: StagedTransaction[] = [];
  const id = (suffix: string): BankTransactionId => asId<'BankTransaction'>(`txn-${suffix}`);

  // 28 confidently-matched rent receipts across the four weekly room leases.
  const rentRuns = [
    { ref: '166C-R1', tenant: 'L. Okafor', room: 'Room 1', amount: 350 },
    { ref: '166C-R2', tenant: 'M. Chen', room: 'Room 2', amount: 330 },
    { ref: '166C-R4', tenant: 'S. Williams', room: 'Room 4', amount: 340 },
    { ref: '166C-R5', tenant: 'D. Rahman', room: 'Room 5', amount: 360 },
  ];
  const weeklyDates = ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31'];

  rentRuns.forEach((run) => {
    weeklyDates.forEach((date, index) => {
      // D. Rahman's lease starts 10 Aug, so there is no receipt in the first week.
      if (run.ref === '166C-R5' && index === 0) return;
      rows.push({
        id: id(`rent-${run.ref}-${date}`),
        importId: IMPORT_ID,
        date,
        rawDescription: `${run.tenant.split(' ').pop()?.toUpperCase() ?? ''} RENT ${run.room.replace(' ', '').toUpperCase()}`,
        rawReference: `Ref ${run.ref}`,
        amount: fromMajorUnits(run.amount),
        suggestion: {
          kind: 'rent',
          label: `Rent · ${run.tenant} · ${run.room}`,
          detail: 'Full payment · charge settled',
          confidence: 0.96,
          targetRef: run.ref,
          propertyId: PROPERTY_IDS.comptonRd,
        },
        state: 'auto-matched',
      });
    });
  });

  // Recurring debits the matcher recognises from prior periods.
  const debits = [
    { suffix: 'insurance-0805', date: '2026-08-05', description: 'TERRI SCHEER INSURANCE', amount: -142.5, label: 'Landlord insurance · monthly instalment' },
    { suffix: 'council-0812', date: '2026-08-12', description: 'BRISBANE CITY COUNCIL', amount: -311.25, label: 'Council rates · 20 Benton St' },
    { suffix: 'agent-0815', date: '2026-08-15', description: 'PROPERTY AGENT FEE', amount: -418.0, label: 'Management fee · 20 Benton St' },
    { suffix: 'loan-macq-0801', date: '2026-08-01', description: 'MACQUARIE LOAN 4417', amount: -3_860, label: 'Loan repayment · Macquarie 4417' },
    { suffix: 'loan-cba-0801', date: '2026-08-01', description: 'CBA LOAN 8820', amount: -6_250, label: 'Loan repayment · CBA 8820' },
    { suffix: 'loan-anz-0815', date: '2026-08-15', description: 'ANZ LOAN 3305', amount: -1_830, label: 'Loan repayment · ANZ 3305' },
    { suffix: 'electricity-0818', date: '2026-08-18', description: 'ENERGEX RETAIL 7741', amount: -186.4, label: 'Electricity · 166 Compton Rd common areas' },
    { suffix: 'smoke-0820', date: '2026-08-20', description: 'SMOKE ALARM SOLUTIONS', amount: -99.0, label: 'Compliance service · annual' },
    { suffix: 'strata-0826', date: '2026-08-26', description: 'STRATA MGMT WATSON', amount: -373.33, label: 'Body corporate levy · Watson Rd' },
  ];
  debits.forEach((debit) => {
    rows.push({
      id: id(debit.suffix),
      importId: IMPORT_ID,
      date: debit.date,
      rawDescription: debit.description,
      rawReference: 'Direct debit',
      amount: fromMajorUnits(debit.amount),
      suggestion: { kind: 'expense', label: debit.label, confidence: 0.93 },
      state: 'auto-matched',
    });
  });

  // Two further low-confidence suggestions awaiting review.
  rows.push(
    {
      id: id('hardware-0810'),
      importId: IMPORT_ID,
      date: '2026-08-10',
      rawDescription: 'MITRE 10 SUNNYBANK',
      rawReference: 'Card',
      amount: fromMajorUnits(-96.35),
      suggestion: { kind: 'expense', label: 'Repairs & maintenance · property?', detail: 'Could not determine property', confidence: 0.38 },
      state: 'needs-review',
    },
    {
      id: id('unknown-eft-0814'),
      importId: IMPORT_ID,
      date: '2026-08-14',
      rawDescription: 'EFTPOS 8842 OXLEY',
      rawReference: 'Card',
      amount: fromMajorUnits(-64.9),
      suggestion: { kind: 'unknown', label: 'Possible property expense', detail: 'No matching supplier on file', confidence: 0.29 },
      state: 'needs-review',
    },
  );

  // Three further rows with no suggestion at all. With the $1,200 cash deposit
  // above these make up the $3,120 the import summary reports as unallocated.
  const unmatched = [
    { suffix: 'deposit-0806', date: '2026-08-06', description: 'DEPOSIT 1802', reference: 'Cash deposit', amount: 820 },
    { suffix: 'transfer-in-0813', date: '2026-08-13', description: 'TFR FROM 04-1187', reference: 'Unknown account', amount: 700 },
    { suffix: 'deposit-0827', date: '2026-08-27', description: 'DEPOSIT 1866', reference: 'Cash deposit', amount: 400 },
  ];
  unmatched.forEach((entry) => {
    rows.push({
      id: id(entry.suffix),
      importId: IMPORT_ID,
      date: entry.date,
      rawDescription: entry.description,
      rawReference: entry.reference,
      amount: fromMajorUnits(entry.amount),
      suggestion: null,
      state: 'unmatched',
    });
  });

  return rows;
}

export function seedStagedTransactions(): readonly StagedTransaction[] {
  return [...featuredTransactions(), ...routineTransactions()].sort((a, b) => b.date.localeCompare(a.date));
}
