'use client';

import { useState } from 'react';
import { Banner } from '@/shared/components/Banner';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Kpi, KpiGrid } from '@/shared/components/Kpi';
import { Stack, Sub } from '@/shared/components/Layout';
import { Stepper, type StepperStep } from '@/shared/components/Stepper';
import { FieldGrid, SelectField, TextField } from '@/shared/components/Field';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { formatMoney } from '@/shared/lib/money';
import { formatDateShort } from '@/shared/lib/dates';
import { StagedTransactionsTable } from './StagedTransactionsTable';
import { allocateTransactionAction } from '../actions';
import type { BankImport, ImportSummary, StagedTransaction } from '../model';

export interface ImportScreenProps {
  readonly bankImport: BankImport;
  readonly steps: readonly StepperStep[];
  readonly summary: ImportSummary;
  readonly transactions: readonly StagedTransaction[];
  readonly highConfidenceCount: number;
  /** Confirmed rows not yet posted to the ledger. */
  readonly readyToPostCount: number;
  /** Formatted period label, e.g. "1–31 Aug 2026 · CSV". */
  readonly periodLabel: string;
  /** Allocation targets, resolved on the server. */
  readonly allocationOptions: readonly { readonly value: string; readonly label: string }[];
}

/** FR-06 — bank import wizard and matching review. */
export function ImportScreen({
  bankImport,
  steps,
  summary,
  transactions,
  highConfidenceCount,
  readyToPostCount,
  periodLabel,
  allocationOptions,
}: ImportScreenProps) {
  const [allocating, setAllocating] = useState<StagedTransaction | null>(null);
  const awaitingReviewCount = summary.autoMatched + summary.needsReview;
  const posted = bankImport.stage === 'posted';
  const unmatchedNote =
    summary.unmatched > 0
      ? ` ${summary.unmatched} unmatched row${summary.unmatched === 1 ? ' stays' : 's stay'} unposted until allocated.`
      : '';

  return (
    <Stack>
      <Card>
        <CardBody>
          <Stepper steps={steps} label="Import progress" />
        </CardBody>
      </Card>

      {posted && readyToPostCount === 0 ? (
        <Banner tone="info" icon="i-check" title="Import posted to ledger">
          Confirmed rows are now part of posted cash flow and can no longer be changed.{unmatchedNote}
        </Banner>
      ) : null}

      {awaitingReviewCount === 0 && readyToPostCount > 0 ? (
        <Banner
          tone="info"
          icon="i-check"
          title={`Every row is reviewed · ${readyToPostCount} confirmed row${readyToPostCount === 1 ? '' : 's'} ready to post`}
        >
          Use “Post to ledger” above the table to finish this import.{unmatchedNote}
        </Banner>
      ) : null}

      {bankImport.duplicatesSkipped > 0 ? (
        <Banner
          tone="warn"
          title={`${bankImport.duplicatesSkipped} rows already imported on ${
            bankImport.duplicatesSkippedFromDate ? formatDateShort(bankImport.duplicatesSkippedFromDate) : 'a prior date'
          } were skipped`}
        >
          Matched on date, amount and bank reference. Balances are unchanged.{' '}
          <a href="#skipped-rows" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Review skipped rows
          </a>
        </Banner>
      ) : null}

      <KpiGrid>
        <Kpi
          label={`${bankImport.accountLabel} · import ${formatDateShort(bankImport.importedOn)}`}
          value={summary.staged}
          valueSuffix="rows staged"
          footer={periodLabel}
        />
        <Kpi
          label="Auto-matched"
          value={summary.autoMatched}
          valueStyle={{ color: 'var(--good)' }}
          footer="Awaiting your confirmation"
        />
        <Kpi
          label="Needs review"
          value={summary.needsReview}
          valueStyle={{ color: 'var(--warn)' }}
          footer="Low-confidence suggestions"
        />
        <Kpi
          label="Unmatched"
          value={summary.unmatched}
          valueSuffix={formatMoney(summary.unmatchedValue)}
          footer="Stay unposted until allocated"
        />
      </KpiGrid>

      {allocating ? (
        <Card>
          <CardHeader
            title={`Allocate · ${allocating.rawDescription}`}
            aside={<Sub>{formatMoney(allocating.amount, { showCents: true, signed: true })} on {formatDateShort(allocating.date)}</Sub>}
          />
          <CardBody>
            <ActionForm
              action={allocateTransactionAction}
              submitLabel="Allocate and confirm"
              onCancel={() => setAllocating(null)}
              onSuccess={() => setAllocating(null)}
              hiddenFields={{ transactionId: allocating.id }}
              footnote={
                <Sub style={{ fontSize: 12 }}>
                  Your correction is stored alongside the original suggestion. The raw bank text is never rewritten.
                </Sub>
              }
            >
              {({ fieldErrors }) => (
                <FieldGrid>
                  <SelectField
                    id="alloc-target"
                    name="allocation"
                    label="Allocate to"
                    required
                    invalid={Boolean(firstError(fieldErrors, 'allocation'))}
                    hint={firstError(fieldErrors, 'allocation')}
                    options={[{ value: '', label: 'Choose…' }, ...allocationOptions]}
                  />
                  <TextField id="alloc-note" name="note" label="Note" placeholder="Why this allocation" />
                </FieldGrid>
              )}
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}

      <StagedTransactionsTable
        rows={transactions}
        highConfidenceCount={highConfidenceCount}
        importId={bankImport.id}
        awaitingReviewCount={awaitingReviewCount}
        readyToPostCount={readyToPostCount}
        onAllocate={setAllocating}
      />

      <Sub style={{ fontSize: 12 }}>
        Suggested matches never post on their own. Every accepted row keeps the raw bank text and your correction, with
        who confirmed it and when.
      </Sub>
    </Stack>
  );
}
