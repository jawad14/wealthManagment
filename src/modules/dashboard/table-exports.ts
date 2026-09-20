/**
 * Table exports (FR-09) — the Properties, Leases, Loans and Obligations lists as CSV.
 *
 * Same rule as `exports.ts`: an export is a rendering of what the caller could
 * already see. Each resource asserts `export.create` *and* the capability its
 * screen requires, then narrows rows to the properties the scope reaches.
 *
 * Amounts are written as plain dollars ("1860.00") rather than display strings
 * ("$1,860"), so a spreadsheet reads them as numbers.
 */
import type { Money } from '@/shared/lib/money';
import type { IsoDate } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import { canReachProperty, type AccessScope, type Capability } from '@/modules/access/permissions';
import { propertiesService } from '@/modules/properties/service';
import type { PropertyStatus, RentalMode } from '@/modules/properties/model';
import { loansService } from '@/modules/loans/service';
import { RATIO_UNAVAILABLE_LABELS } from '@/modules/loans/model';
import { leasesService } from '@/modules/leases/service';
import { FREQUENCY_LABELS, type LeaseStatus } from '@/modules/leases/model';
import { obligationsService } from '@/modules/obligations/service';
import { RECURRENCE_LABELS } from '@/modules/obligations/model';
import { csvCell, type ExportResult } from './exports';

export const TABLE_EXPORT_RESOURCES = ['properties', 'leases', 'loans', 'obligations'] as const;
export type TableExportResource = (typeof TABLE_EXPORT_RESOURCES)[number];

export function isTableExportResource(value: string): value is TableExportResource {
  return (TABLE_EXPORT_RESOURCES as readonly string[]).includes(value);
}

/** The capability each table requires — the same one its screen requires. */
const RESOURCE_CAPABILITY: Record<TableExportResource, Capability> = {
  properties: 'property.read',
  leases: 'lease.read',
  loans: 'loan.read',
  obligations: 'obligation.read',
};

const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  rented: 'Rented',
  'own-home': 'Own home',
  vacant: 'Vacant',
  'under-construction': 'Under construction',
};

const RENTAL_MODE_LABELS: Record<RentalMode, string> = {
  whole: 'Whole property',
  'by-room': 'By room',
  'not-rented': 'Not rented',
};

const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  active: 'Active',
  'ending-soon': 'Ending soon',
  disputed: 'Disputed',
  ended: 'Ended',
};

/** Integer cents to plain dollars: 186000 -> "1860.00". Null stays empty, never "0.00". */
export function centsToDollars(value: Money | null | undefined): string {
  if (value == null) return '';
  const magnitude = Math.abs(value.cents);
  const dollars = Math.floor(magnitude / 100);
  const cents = String(magnitude % 100).padStart(2, '0');
  return `${value.cents < 0 ? '-' : ''}${dollars}.${cents}`;
}

/**
 * Free text is user-entered, so a cell opening with a formula character is
 * prefixed with an apostrophe — a spreadsheet then shows it as text instead of
 * evaluating it. Numeric cells skip this so a negative balance stays a number.
 */
function textCell(value: string): string {
  return csvCell(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);
}

function percentCell(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

interface Table {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

const TABLES: Record<TableExportResource, (asOf: IsoDate, scope: AccessScope) => Table> = {
  properties: (asOf, scope) => ({
    header: ['Address', 'Ownership', 'Status', 'Rental Mode', 'Valuation Amount', 'Valuation Date', 'Debt', 'LVR'],
    rows: accessService.filterProperties(scope, propertiesService.list()).map((property) => {
      const valuation = propertiesService.valuationStatus(property.id, asOf).valuation;
      const lvr = loansService.propertyLvr(property.id, asOf);
      return [
        textCell(property.fullAddress || property.name),
        textCell(property.ownershipLabel),
        csvCell(PROPERTY_STATUS_LABELS[property.status]),
        csvCell(RENTAL_MODE_LABELS[property.rentalMode]),
        csvCell(centsToDollars(valuation?.amount)),
        csvCell(valuation?.valuedOn ?? ''),
        csvCell(centsToDollars(loansService.debtForProperty(property.id)?.amount)),
        csvCell(lvr.available ? percentCell(lvr.value) : 'Unavailable'),
      ];
    }),
  }),

  leases: (asOf, scope) => ({
    header: ['Tenant Name', 'Property', 'Start Date', 'End Date', 'Rent Amount', 'Frequency', 'Balance', 'Status'],
    rows: leasesService
      .list()
      .filter((lease) => canReachProperty(scope, lease.propertyId))
      .map((lease) => leasesService.view(lease, asOf))
      .map((view) => [
        textCell(view.tenantName),
        textCell(view.propertyLabel),
        csvCell(view.lease.startsOn),
        csvCell(view.lease.endsOn),
        csvCell(centsToDollars(view.lease.rent)),
        csvCell(FREQUENCY_LABELS[view.lease.frequency]),
        // Negative when owing, positive when paid ahead — as on the property detail row.
        csvCell(centsToDollars(leasesService.balanceForLease(view.lease.id, asOf))),
        csvCell(LEASE_STATUS_LABELS[view.status]),
      ]),
  }),

  loans: (asOf, scope) => ({
    header: ['Lender', 'Facility', 'Borrower', 'Balance', 'Rate', 'Repayment', 'Securing Property', 'LVR'],
    rows: loansService
      .list()
      .filter((loan) => loan.security.propertyIds.every((propertyId) => canReachProperty(scope, propertyId)))
      .map((loan) => {
        const lvr = loansService.facilityLvr(loan.id, asOf);
        const reason = loansService.facilityLvrReason(loan.id, asOf);
        return [
          textCell(loan.lender),
          textCell(loan.facilityName),
          textCell(loan.counterpartyLabel),
          csvCell(centsToDollars(loan.balance)),
          csvCell(`${(loan.rate.annual * 100).toFixed(2)}% ${loan.rate.type}`),
          csvCell(centsToDollars(loan.repayment.monthly)),
          textCell(loan.security.label),
          csvCell(
            lvr.available
              ? percentCell(lvr.value)
              : reason === 'not-secured'
                ? ''
                : reason
                  ? RATIO_UNAVAILABLE_LABELS[reason]
                  : 'Unavailable',
          ),
        ];
      }),
  }),

  obligations: (asOf, scope) => ({
    header: ['Title', 'Context', 'Property', 'Due Date', 'Recurrence', 'Amount', 'Status', 'Owner'],
    rows: obligationsService
      .listViews(asOf, 'all')
      // An obligation with no property is portfolio-level; the capability covers it.
      .filter(({ obligation }) => !obligation.propertyId || canReachProperty(scope, obligation.propertyId))
      .map((view) => [
        textCell(view.obligation.title),
        textCell(view.obligation.contextLabel),
        textCell(view.obligation.propertyId ? propertiesService.require(view.obligation.propertyId).name : ''),
        csvCell(view.obligation.dueOn),
        csvCell(RECURRENCE_LABELS[view.obligation.recurrence]),
        csvCell(centsToDollars(view.obligation.amount)),
        textCell(view.statusLabel),
        textCell(view.ownerName ?? ''),
      ]),
  }),
};

export const tableExportsService = {
  /**
   * Export one list screen as CSV.
   *
   * Both rights are required: holding `export.create` does not unlock a table
   * the caller cannot read, and reading a table does not grant the right to
   * take it out of the platform.
   */
  exportTable(resource: TableExportResource, asOf: IsoDate): ExportResult {
    const scope = accessService.currentScope();
    accessService.requireCapability(scope, 'export.create');
    accessService.requireCapability(scope, RESOURCE_CAPABILITY[resource]);

    const table = TABLES[resource](asOf, scope);

    accessService.record({
      actor: accessService.resolveUserName(scope.userId) ?? 'unknown',
      summary: `Export · ${resource} table (permission-filtered)`,
      context: `${table.rows.length} rows · as of ${asOf}`,
    });

    return {
      filename: `${resource}-${asOf}.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: [table.header.map(csvCell).join(','), ...table.rows.map((row) => row.join(','))].join('\r\n'),
    };
  },
};
