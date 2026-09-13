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
  devlinReceivable: asId<'Loan'>('loan-devlin-receivable'),
};

export function seedLoans(): readonly Loan[] {
  return [
    {
      id: LOAN_IDS.macquarie4417,
      lender: 'Macquarie',
      facilityName: 'Home loan 4417',
      direction: 'liability',
      counterpartyLabel: 'Adam & Nadia',
      borrowerEntityIds: [ENTITY_IDS.adam, ENTITY_IDS.nadia],
      balance: fromMajorUnits(612_400),
      balanceAsOf: '2026-08-31',
      rate: { annual: 0.0589, type: 'fixed', fixedUntil: '2026-09-30' },
      repayment: {
        type: 'P&I',
        monthly: fromMajorUnits(3_860),
        interestComponent: fromMajorUnits(3_006),
        principalComponent: fromMajorUnits(854),
      },
      security: { kind: 'single', propertyIds: [PROPERTY_IDS.calderRd], label: 'Calder Rd' },
      rateReviewOn: '2026-09-30',
    },
    {
      id: LOAN_IDS.cba8820,
      lender: 'CBA',
      facilityName: 'Investment loan 8820',
      facilityNote: 'Cross-collateralised',
      direction: 'liability',
      counterpartyLabel: 'Northgate Holdings Pty Ltd',
      borrowerEntityIds: [ENTITY_IDS.northgate],
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
        propertyIds: [PROPERTY_IDS.harlowRd, PROPERTY_IDS.marlinSt],
        label: 'Harlow Rd + Marlin St',
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
      counterpartyLabel: 'Whitfield Family Trust',
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
      security: { kind: 'single', propertyIds: [PROPERTY_IDS.vernonRd], label: 'Vernon Rd' },
    },
    {
      // FR-11: money lent out. An asset, never part of debt and never an expense.
      id: LOAN_IDS.devlinReceivable,
      lender: 'Personal loan · to M. Devlin',
      facilityName: 'Personal loan · to M. Devlin',
      facilityNote: 'Receivable, not an expense (FR-11)',
      direction: 'receivable',
      counterpartyLabel: 'Adam (lender)',
      borrowerEntityIds: [ENTITY_IDS.adam],
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
