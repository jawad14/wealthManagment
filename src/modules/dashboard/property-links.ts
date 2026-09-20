/**
 * Linked records for one property (FR-02).
 *
 * The property detail tabs show what hangs off a property: its valuation
 * history, the facilities it secures, its obligations and its documents. That is
 * a cross-module question, so it is assembled here rather than in `properties`,
 * which must not depend on loans, obligations or documents.
 *
 * Everything returned is a plain serialisable row, ready to cross the
 * server/client boundary into `PropertyDetail`.
 */
import { formatPercent, money, type Money } from '@/shared/lib/money';
import { formatDateShort, toDate } from '@/shared/lib/dates';
import type { IsoDate, PropertyId } from '@/shared/types/common';
import { propertiesService } from '@/modules/properties/service';
import { propertiesRepository } from '@/modules/properties/repository';
import { isMarketBasis, VALUATION_BASIS_LABELS, type RentalMode } from '@/modules/properties/model';
import { loansService } from '@/modules/loans/service';
import { RATIO_UNAVAILABLE_LABELS, type RatioUnavailableReason } from '@/modules/loans/model';
import { obligationsService } from '@/modules/obligations/service';
import { RECURRENCE_LABELS, type ObligationStatus } from '@/modules/obligations/model';
import { documentsService } from '@/modules/documents/service';

export interface ValuationRow {
  readonly id: string;
  readonly amount: Money;
  readonly valuedOnLabel: string;
  readonly basisLabel: string;
  readonly confidence: string;
  /** Whether this is the figure currently shown for the property. */
  readonly isCurrent: boolean;
  readonly note: string;
}

export interface SecuredLoanRow {
  readonly id: string;
  readonly lender: string;
  readonly facilityName: string;
  readonly securityLabel: string;
  readonly isPool: boolean;
  readonly isReceivable: boolean;
  readonly balance: Money;
  readonly rateLabel: string;
  readonly repaymentType: string;
}

export interface PropertyObligationRow {
  readonly id: string;
  readonly title: string;
  readonly contextLabel: string;
  readonly dueLabel: string;
  readonly recurrenceLabel: string;
  readonly amount: Money | null;
  readonly status: ObligationStatus;
  readonly statusLabel: string;
}

export interface PropertyDocumentRow {
  readonly id: string;
  readonly filename: string;
  readonly descriptor: string | null;
  readonly typeLabel: string;
  readonly versionCount: number;
  readonly latestVersionNote: string | null;
  readonly uploadedLabel: string;
}

export interface PropertyOverview {
  readonly address: string;
  readonly ownershipLabel: string;
  readonly rentalModeLabel: string;
  readonly valuationAmount: Money | null;
  /** "Bank val · Aug 2026", or "No valuation recorded". */
  readonly valuationLabel: string;
  readonly securingLoanCount: number;
  readonly totalDebt: Money;
  /** Set when the debt figure rests on an unapproved pool allocation. */
  readonly debtNote: string | null;
  /** A percentage, or the reason one cannot be published — never "0%". */
  readonly lvrLabel: string;
}

export interface PropertyLinks {
  readonly overview: PropertyOverview;
  readonly valuations: readonly ValuationRow[];
  readonly loans: readonly SecuredLoanRow[];
  readonly obligations: readonly PropertyObligationRow[];
  readonly documents: readonly PropertyDocumentRow[];
}

const RENTAL_MODE_LABELS: Record<RentalMode, string> = {
  'by-room': 'Rented by room',
  whole: 'Rented as a whole',
  'not-rented': 'Not rented',
};

export const propertyLinksService = {
  forProperty(propertyId: PropertyId, asOf: IsoDate): PropertyLinks {
    const property = propertiesService.require(propertyId);
    const valuationStatus = propertiesService.valuationStatus(propertyId, asOf);

    const valuations = [...propertiesRepository.listValuations(propertyId)]
      .sort((a, b) => b.valuedOn.localeCompare(a.valuedOn))
      .map<ValuationRow>((valuation) => ({
        id: valuation.id,
        amount: valuation.amount,
        valuedOnLabel: `${formatDateShort(valuation.valuedOn)} ${toDate(valuation.valuedOn).getUTCFullYear()}`,
        basisLabel: VALUATION_BASIS_LABELS[valuation.basis],
        confidence: valuation.confidence,
        isCurrent: valuation.id === valuationStatus.valuation?.id,
        note: isMarketBasis(valuation.basis)
          ? 'Market assessment · can drive ratios while current'
          : 'Records what was paid · never treated as current',
      }));

    const secured = loansService.list().filter((loan) => loan.security.propertyIds.includes(propertyId));
    const loans = secured.map<SecuredLoanRow>((loan) => ({
      id: loan.id,
      lender: loan.lender,
      facilityName: loan.facilityName,
      securityLabel: loan.security.label,
      isPool: loan.security.kind === 'pool',
      isReceivable: loan.direction === 'receivable',
      balance: loan.balance,
      rateLabel: `${(loan.rate.annual * 100).toFixed(2)}% ${loan.rate.type === 'fixed' ? 'fixed' : 'var'}`,
      repaymentType: loan.repayment.type,
    }));

    const obligations = obligationsService
      .list()
      .filter((obligation) => obligation.propertyId === propertyId)
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
      .map<PropertyObligationRow>((obligation) => ({
        id: obligation.id,
        title: obligation.title,
        contextLabel: obligation.contextLabel,
        dueLabel: formatDateShort(obligation.dueOn),
        recurrenceLabel: RECURRENCE_LABELS[obligation.recurrence],
        amount: obligation.amount,
        status: obligationsService.status(obligation, asOf),
        statusLabel: obligationsService.statusLabel(obligation, asOf),
      }));

    const documents = documentsService
      .list()
      .filter((view) => view.record.links.some((link) => link.type === 'property' && link.propertyId === propertyId))
      .map<PropertyDocumentRow>((view) => ({
        id: view.record.id,
        filename: view.record.filename,
        descriptor: view.record.descriptor ?? null,
        typeLabel: view.typeLabel,
        versionCount: view.versionCount,
        latestVersionNote: view.latestVersionNote,
        uploadedLabel: view.uploadedLabel,
      }));

    const debt = loansService.debtForProperty(propertyId);
    const lvr = loansService.propertyLvr(propertyId, asOf);

    return {
      overview: {
        address: property.fullAddress,
        ownershipLabel: property.ownershipLabel,
        rentalModeLabel: RENTAL_MODE_LABELS[property.rentalMode],
        valuationAmount: valuationStatus.valuation?.amount ?? null,
        valuationLabel: valuationStatus.label,
        securingLoanCount: secured.filter((loan) => loan.direction === 'liability').length,
        totalDebt: debt?.amount ?? money(0),
        debtNote:
          debt?.viaPolicy && !debt.viaPolicy.approved ? `Provisional · ${debt.viaPolicy.label} not approved` : null,
        lvrLabel: lvr.available
          ? formatPercent(lvr.value)
          : (RATIO_UNAVAILABLE_LABELS[lvr.reason as RatioUnavailableReason] ?? 'Unavailable'),
      },
      valuations,
      loans,
      obligations,
      documents,
    };
  },
};
