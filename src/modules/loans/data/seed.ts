/**
 * Seeded facilities. Mirrors the "Loans & liabilities" screen of the prototype.
 *
 * Repayment splits are recorded statement facts. Where the prototype's summary
 * split could not hold arithmetically (see docs/DESIGN_FIDELITY.md), the split
 * seeded here is the one consistent with each facility's own type and rate.
 */
import { asId } from '@/shared/types/common';
import { fromMajorUnits } from '@/shared/lib/money';
import { ENTITY_IDS, PROPERTY_IDS } from '@/modules/entities/data/seed';
import type { Loan } from '../model';

export const LOAN_IDS = {
  macquarie4417: asId<'Loan'>('loan-macq-4417'),
  cba8820: asId<'Loan'>('loan-cba-8820'),
  anz3305: asId<'Loan'>('loan-anz-3305'),
  khalidReceivable: asId<'Loan'>('loan-khalid-receivable'),
};

export function seedLoans(): readonly Loan[] {
  return [
    {
      id: LOAN_IDS.macquarie4417,
      lender: 'Macquarie',
      facilityName: 'Home loan 4417',
      direction: 'liability',
      counterpartyLabel: 'Jawad & Mahvish',
      borrowerEntityIds: [ENTITY_IDS.jawad, ENTITY_IDS.mahvish],
      balance: fromMajorUnits(612_400),
      balanceAsOf: '2026-08-31',
      rate: { annual: 0.0589, type: 'fixed', fixedUntil: '2026-09-30' },
      repayment: {
        type: 'P&I',
        monthly: fromMajorUnits(3_860),
        interestComponent: fromMajorUnits(3_006),
        principalComponent: fromMajorUnits(854),
      },
      security: { kind: 'single', propertyIds: [PROPERTY_IDS.watsonRd], label: 'Watson Rd' },
      rateReviewOn: '2026-09-30',
    },
    {
      id: LOAN_IDS.cba8820,
      lender: 'CBA',
      facilityName: 'Investment loan 8820',
      facilityNote: 'Cross-collateralised',
      direction: 'liability',
      counterpartyLabel: 'Esteem Development Pty Ltd',
      borrowerEntityIds: [ENTITY_IDS.esteem],
      balance: fromMajorUnits(1_184_000),
      balanceAsOf: '2026-08-31',
      rate: { annual: 0.0634, type: 'variable' },
      repayment: {
        type: 'IO',
        monthly: fromMajorUnits(6_250),
        interestComponent: fromMajorUnits(6_250),
        principalComponent: fromMajorUnits(0),
      },
      security: {
        kind: 'pool',
        propertyIds: [PROPERTY_IDS.comptonRd, PROPERTY_IDS.bentonSt],
        label: 'Compton Rd + Benton St',
      },
      // Present but not approved: it may inform the working per-property figure
      // the property cards show, and must not drive a published LVR.
      allocationPolicy: {
        kind: 'equal-split',
        approved: false,
        note: '50% policy — awaiting approval',
      },
    },
    {
      id: LOAN_IDS.anz3305,
      lender: 'ANZ',
      facilityName: 'Investment loan 3305',
      direction: 'liability',
      counterpartyLabel: 'Siddique Family Trust',
      borrowerEntityIds: [ENTITY_IDS.familyTrust],
      balance: fromMajorUnits(410_300),
      balanceAsOf: '2026-08-15',
      rate: { annual: 0.0619, type: 'variable' },
      repayment: {
        type: 'P&I',
        monthly: fromMajorUnits(1_830),
        interestComponent: fromMajorUnits(1_830),
        principalComponent: fromMajorUnits(0),
      },
      security: { kind: 'single', propertyIds: [PROPERTY_IDS.miansRd], label: 'Mians Rd' },
    },
    {
      // FR-11: money lent out. An asset, never part of debt and never an expense.
      id: LOAN_IDS.khalidReceivable,
      lender: 'Personal loan · to S. Khalid',
      facilityName: 'Personal loan · to S. Khalid',
      facilityNote: 'Receivable, not an expense (FR-11)',
      direction: 'receivable',
      counterpartyLabel: 'Jawad (lender)',
      borrowerEntityIds: [ENTITY_IDS.jawad],
      balance: fromMajorUnits(120_000),
      balanceAsOf: '2026-09-01',
      rate: { annual: 0.04, type: 'fixed' },
      repayment: {
        type: 'custom',
        monthly: fromMajorUnits(2_500),
        interestComponent: fromMajorUnits(400),
        principalComponent: fromMajorUnits(2_100),
      },
      security: { kind: 'unsecured', propertyIds: [], label: 'Unsecured' },
    },
  ];
}
