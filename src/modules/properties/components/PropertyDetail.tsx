'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/Icon';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { Grid, Row, Stat, Sub } from '@/shared/components/Layout';
import { Tabs } from '@/shared/components/Tabs';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { addComponentAction, addValuationAction } from '../actions';
import { formatMoney, formatPercent, type Money } from '@/shared/lib/money';
import type { CapitalGrowth } from '../model';
import type { Tone } from '@/shared/types/common';
import type { IconName } from '@/shared/components/IconSprite';
import type { ArrearsState } from '@/modules/leases/model';
import type { ObligationStatus } from '@/modules/obligations/model';
import type {
  PropertyDocumentRow,
  PropertyObligationRow,
  PropertyOverview,
  SecuredLoanRow,
  ValuationRow,
} from '@/modules/dashboard/property-links';

export interface RoomRow {
  readonly componentId: string;
  readonly label: string;
  readonly tenantName: string | null;
  readonly vacantSinceLabel: string | null;
  readonly termLabel: string | null;
  readonly rent: Money | null;
  readonly frequencyLabel: string | null;
  readonly balance: Money | null;
  readonly state: ArrearsState | null;
}

const STATE_CHIP: Record<ArrearsState, { tone: Tone; icon: IconName; label: string }> = {
  clear: { tone: 'good', icon: 'i-check', label: 'Current' },
  'paid-ahead': { tone: 'good', icon: 'i-check', label: 'Paid ahead' },
  partial: { tone: 'warn', icon: 'i-clock', label: 'Partial' },
  overdue: { tone: 'bad', icon: 'i-alert', label: 'Overdue' },
  disputed: { tone: 'info', icon: 'i-pause', label: 'Disputed' },
};

const OBLIGATION_CHIP: Record<ObligationStatus, { tone: Tone; icon?: IconName }> = {
  paid: { tone: 'good', icon: 'i-check' },
  disputed: { tone: 'info', icon: 'i-pause' },
  overdue: { tone: 'bad', icon: 'i-alert' },
  'reminder-queued': { tone: 'info', icon: 'i-clock' },
  scheduled: { tone: 'neutral' },
  'not-eligible': { tone: 'warn', icon: 'i-alert' },
};

const VALUATION_COLUMNS: readonly DataTableColumn<ValuationRow>[] = [
  {
    header: 'Amount',
    lead: true,
    render: (row) => (
      <Row>
        <CellMain>
          <span className="num">{formatMoney(row.amount)}</span>
        </CellMain>
        {row.isCurrent ? <Chip tone="good">Current</Chip> : null}
      </Row>
    ),
  },
  { header: 'Valued on', render: (row) => row.valuedOnLabel },
  { header: 'Basis', render: (row) => row.basisLabel },
  { header: 'Confidence', render: (row) => <span style={{ textTransform: 'capitalize' }}>{row.confidence}</span> },
  { header: 'Source notes', render: (row) => <Sub>{row.note}</Sub> },
];

const LOAN_COLUMNS: readonly DataTableColumn<SecuredLoanRow>[] = [
  { header: 'Lender', lead: true, render: (row) => <CellMain>{row.lender}</CellMain> },
  {
    header: 'Facility / security',
    render: (row) => (
      <>
        <CellMain>{row.facilityName}</CellMain>
        <CellSub>
          {row.securityLabel}
          {row.isPool ? ' · pooled security' : ''}
          {row.isReceivable ? ' · receivable' : ''}
        </CellSub>
      </>
    ),
  },
  { header: 'Balance', align: 'right', render: (row) => <span className="num">{formatMoney(row.balance)}</span> },
  { header: 'Interest rate', render: (row) => <span className="num">{row.rateLabel}</span> },
  { header: 'Repayment', render: (row) => row.repaymentType },
];

const OBLIGATION_COLUMNS: readonly DataTableColumn<PropertyObligationRow>[] = [
  {
    header: 'Obligation',
    lead: true,
    render: (row) => (
      <>
        <CellMain>{row.title}</CellMain>
        <CellSub>{row.contextLabel}</CellSub>
      </>
    ),
  },
  { header: 'Due', render: (row) => row.dueLabel },
  { header: 'Recurs', render: (row) => row.recurrenceLabel },
  { header: 'Amount', align: 'right', render: (row) => <span className="num">{formatMoney(row.amount)}</span> },
  {
    header: 'Status',
    render: (row) => {
      const chip = OBLIGATION_CHIP[row.status];
      return (
        <Chip tone={chip.tone} icon={chip.icon}>
          {row.statusLabel}
        </Chip>
      );
    },
  },
];

const DOCUMENT_COLUMNS: readonly DataTableColumn<PropertyDocumentRow>[] = [
  {
    header: 'Document',
    lead: true,
    render: (row) => (
      <>
        <CellMain>{row.filename}</CellMain>
        {row.descriptor ? <CellSub>{row.descriptor}</CellSub> : null}
      </>
    ),
  },
  { header: 'Category', render: (row) => row.typeLabel },
  {
    header: 'Version',
    render: (row) => (
      <>
        v{row.versionCount}
        {row.latestVersionNote ? <CellSub>{row.latestVersionNote}</CellSub> : null}
      </>
    ),
  },
  { header: 'Uploaded', render: (row) => row.uploadedLabel },
];

export interface PropertyDetailProps {
  readonly title: string;
  readonly holdingNote: string;
  readonly rooms: readonly RoomRow[];
  readonly overview: PropertyOverview;
  readonly valuations: readonly ValuationRow[];
  readonly loans: readonly SecuredLoanRow[];
  readonly obligations: readonly PropertyObligationRow[];
  readonly documents: readonly PropertyDocumentRow[];
  readonly componentNoun: string;
  readonly valuationDetail: string | null;
  readonly valuationAmount: Money | null;
  readonly capitalGrowth: CapitalGrowth;
  /** Settlement date already formatted for display, or null when not recorded. */
  readonly settledOnLabel: string | null;
  readonly propertyId: string;
  readonly today: string;
}

type DetailTab = 'overview' | 'rooms' | 'loans' | 'obligations' | 'documents' | 'valuations' | 'history';

/**
 * Property detail card.
 *
 * The closing note is deliberate: rooms are operational components, so the
 * property counts once in net worth no matter how many rooms it has.
 */
export function PropertyDetail({
  title,
  holdingNote,
  rooms,
  overview,
  valuations,
  loans,
  obligations,
  documents,
  componentNoun,
  valuationDetail,
  valuationAmount,
  capitalGrowth,
  settledOnLabel,
  propertyId,
  today,
}: PropertyDetailProps) {
  const [tab, setTab] = useState<DetailTab>('rooms');
  const [isValuing, setValuing] = useState(false);
  const [isAddingComponent, setAddingComponent] = useState(false);
  const noun = componentNoun.toLowerCase();
  const activeLeases = rooms.filter((room) => room.state !== null).length;

  // The direction is spelled out in words as well as colour.
  const growthCents = capitalGrowth.growthAmount?.cents ?? null;
  const growthStyle =
    growthCents === null || growthCents === 0
      ? undefined
      : { color: growthCents > 0 ? 'var(--good)' : 'var(--bad)' };
  const growthMeta =
    growthCents === null
      ? 'Needs a purchase price and a valuation'
      : growthCents === 0
        ? 'No change on cost basis'
        : `${growthCents > 0 ? 'Up' : 'Down'} ${formatPercent(Math.abs(capitalGrowth.growthPercent ?? 0))} on cost basis`;

  const columns: readonly DataTableColumn<RoomRow>[] = [
    { header: componentNoun, lead: true, render: (row) => <CellMain>{row.label}</CellMain> },
    {
      header: 'Tenant',
      render: (row) =>
        row.tenantName ?? <Sub>{row.vacantSinceLabel ? `Vacant since ${row.vacantSinceLabel}` : 'Vacant'}</Sub>,
    },
    { header: 'Lease', render: (row) => row.termLabel ?? '—' },
    {
      header: 'Rent',
      align: 'right',
      render: (row) => <span className="num">{row.rent ? formatMoney(row.rent) : '—'}</span>,
    },
    { header: 'Frequency', render: (row) => row.frequencyLabel ?? '—' },
    {
      header: 'Balance',
      align: 'right',
      render: (row) =>
        row.balance === null ? (
          '—'
        ) : (
          <span
            className="num"
            style={
              row.balance.cents < 0
                ? { color: 'var(--bad)' }
                : row.balance.cents > 0
                  ? { color: 'var(--good)' }
                  : undefined
            }
          >
            {formatMoney(row.balance, { signed: true })}
          </span>
        ),
    },
    {
      header: 'Status',
      render: (row) => {
        if (row.state === null) {
          // Lease creation lives on the leases screen, where the form and the
          // charge-schedule preview are; sending the user there beats a second
          // copy of the same form here.
          return (
            <Link className="btn sm" href="/leases">
              Create lease
            </Link>
          );
        }
        const chip = STATE_CHIP[row.state];
        return (
          <Chip tone={chip.tone} icon={chip.icon}>
            {chip.label}
          </Chip>
        );
      },
    },
  ];

  return (
    <Card id="propDetail">
      <CardHeader style={{ flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>{title}</h3>
          <Sub>{holdingNote}</Sub>
        </div>
        <Row>
          <Button small onClick={() => setValuing((open) => !open)}>
            {isValuing ? 'Close' : 'Add valuation'}
          </Button>
          <Button small variant="ghost" aria-label="More actions">
            <Icon name="i-more" />
          </Button>
        </Row>
      </CardHeader>

      {isValuing ? (
        <CardBody style={{ borderBottom: '1px solid var(--line-2)' }}>
          <ActionForm
            action={addValuationAction}
            submitLabel="Record valuation"
            onCancel={() => setValuing(false)}
            onSuccess={() => setValuing(false)}
            hiddenFields={{ propertyId }}
            footnote={
              <Sub style={{ fontSize: 12 }}>
                Only a bank valuation or agent appraisal is eligible to drive a ratio. A purchase price or build cost is
                shown as the last known figure but never treated as current.
              </Sub>
            }
          >
            {({ fieldErrors }) => (
              <FieldGrid>
                <TextField
                  id="val-amount" name="amount" label="Valuation" required placeholder="1,180,000"
                  invalid={Boolean(firstError(fieldErrors, 'amount'))}
                  hint={firstError(fieldErrors, 'amount')}
                />
                <TextField id="val-date" name="valuedOn" label="Valued on" type="date" defaultValue={today} required />
                <SelectField
                  id="val-basis" name="basis" label="Basis" defaultValue="bank"
                  options={[
                    { value: 'bank', label: 'Bank valuation' },
                    { value: 'agent-appraisal', label: 'Agent appraisal' },
                    { value: 'purchase-price', label: 'Purchase price' },
                    { value: 'at-cost', label: 'At cost' },
                  ]}
                />
                <SelectField
                  id="val-confidence" name="confidence" label="Confidence" defaultValue="medium"
                  options={[
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ]}
                />
              </FieldGrid>
            )}
          </ActionForm>
        </CardBody>
      ) : null}

      <Tabs
        style={{ padding: '0 18px' }}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'rooms', label: `${componentNoun}s & leases` },
          { value: 'loans', label: 'Loans' },
          { value: 'obligations', label: 'Obligations' },
          { value: 'documents', label: 'Documents' },
          { value: 'valuations', label: 'Valuations' },
          { value: 'history', label: 'History' },
        ]}
      />

      {tab === 'rooms' ? (
        <>
          <CardBody style={{ borderBottom: '1px solid var(--line-2)' }}>
            {isAddingComponent ? (
              <ActionForm
                action={addComponentAction}
                submitLabel={`Add ${noun}`}
                onCancel={() => setAddingComponent(false)}
                onSuccess={() => setAddingComponent(false)}
                // A new component has no tenant yet, so it starts vacant — without
                // this, occupancy would count it as let.
                hiddenFields={{ propertyId, isVacant: 'true' }}
                footnote={
                  <Sub style={{ fontSize: 12 }}>
                    A {noun} tracks tenancies and occupancy only — it does not change this property&apos;s value.
                  </Sub>
                }
              >
                {({ fieldErrors }) => (
                  <FieldGrid>
                    <TextField
                      id="comp-label" name="label" label="Label" required placeholder="Room 4"
                      invalid={Boolean(firstError(fieldErrors, 'label'))}
                      hint={firstError(fieldErrors, 'label')}
                    />
                    <SelectField
                      id="comp-kind" name="kind" label="Kind" defaultValue="room"
                      invalid={Boolean(firstError(fieldErrors, 'kind'))}
                      hint={firstError(fieldErrors, 'kind')}
                      options={[
                        { value: 'room', label: 'Room' },
                        { value: 'whole', label: 'Whole property' },
                      ]}
                    />
                  </FieldGrid>
                )}
              </ActionForm>
            ) : (
              <Button small onClick={() => setAddingComponent(true)}>
                + Add {noun}
              </Button>
            )}
          </CardBody>
          <DataTable columns={columns} rows={rooms} rowKey={(row) => row.componentId} empty="No components recorded." />
        </>
      ) : tab === 'overview' ? (
        <CardBody>
          <Grid columns={4}>
            <Stat label="Address" value={overview.address} meta={overview.ownershipLabel} />
            <Stat label="Rental mode" value={overview.rentalModeLabel} />
            <Stat
              label="Current valuation"
              value={overview.valuationAmount ? formatMoney(overview.valuationAmount) : '—'}
              meta={overview.valuationLabel}
            />
            <Stat
              label="Active leases"
              value={activeLeases}
              meta={`of ${rooms.length} ${componentNoun.toLowerCase()}${rooms.length === 1 ? '' : 's'}`}
            />
            <Stat label="Securing loans" value={overview.securingLoanCount} />
            <Stat
              label="Debt against this property"
              value={overview.securingLoanCount > 0 ? formatMoney(overview.totalDebt) : '—'}
              meta={overview.debtNote}
            />
            <Stat label="LVR" value={overview.lvrLabel} />
          </Grid>

          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '22px 0 12px' }}>Cost basis &amp; capital growth</h3>
          <Grid columns={4}>
            <Stat
              label="Purchase price"
              value={formatMoney(capitalGrowth.purchasePrice)}
              meta={settledOnLabel ? `Settled ${settledOnLabel}` : 'Settlement date not recorded'}
            />
            <Stat
              label="Settlement costs"
              value={formatMoney(capitalGrowth.settlementCosts)}
              meta="Stamp duty, legal fees"
            />
            <Stat
              label="Total cost basis"
              value={formatMoney(capitalGrowth.totalCostBasis)}
              meta="Purchase price + settlement costs"
            />
            <Stat
              label="Current valuation"
              value={formatMoney(capitalGrowth.currentValuation)}
              meta={overview.valuationLabel}
            />
            <Stat
              label="Net capital growth"
              value={formatMoney(capitalGrowth.growthAmount, { signed: true })}
              valueStyle={growthStyle}
              meta={growthMeta}
            />
          </Grid>
        </CardBody>
      ) : tab === 'valuations' ? (
        <DataTable
          columns={VALUATION_COLUMNS}
          rows={valuations}
          rowKey={(row) => row.id}
          empty="No valuations recorded."
        />
      ) : tab === 'loans' ? (
        <DataTable
          columns={LOAN_COLUMNS}
          rows={loans}
          rowKey={(row) => row.id}
          empty="No loans are secured against this property."
        />
      ) : tab === 'obligations' ? (
        <DataTable
          columns={OBLIGATION_COLUMNS}
          rows={obligations}
          rowKey={(row) => row.id}
          empty="No obligations are linked to this property."
        />
      ) : tab === 'documents' ? (
        <DataTable
          columns={DOCUMENT_COLUMNS}
          rows={documents}
          rowKey={(row) => row.id}
          empty="No documents are linked to this property."
        />
      ) : (
        <CardBody>
          <p className="sub" style={{ margin: 0 }}>
            The {tab} tab is not part of this build. See docs/REQUIREMENTS_CHECKLIST.md.
          </p>
        </CardBody>
      )}

      <CardBody
        style={{
          borderTop: '1px solid var(--line-2)',
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          fontSize: 12.5,
          color: 'var(--muted)',
        }}
      >
        <span>
          {componentNoun}s are operational components — this property counts{' '}
          <b style={{ color: 'var(--text)' }}>once</b> in net worth.
        </span>
        {valuationDetail ? (
          <span>
            Valuation {formatMoney(valuationAmount)} · {valuationDetail}
          </span>
        ) : null}
      </CardBody>
    </Card>
  );
}
