'use client';

import { useState } from 'react';
import { Banner } from '@/shared/components/Banner';
import { Card, CardBody } from '@/shared/components/Card';
import { Kpi, KpiGrid } from '@/shared/components/Kpi';
import { Stack, Sub } from '@/shared/components/Layout';
import { Stepper, type StepperStep } from '@/shared/components/Stepper';
import { useToast } from '@/shared/shell/ToastContext';
import { formatMoney } from '@/shared/lib/money';
import { formatDateShort } from '@/shared/lib/dates';
import { StagedTransactionsTable } from './StagedTransactionsTable';
import type { BankImport, ImportSummary, StagedTransaction } from '../model';

export interface ImportScreenProps {
  readonly bankImport: BankImport;
  readonly steps: readonly StepperStep[];
  readonly summary: ImportSummary;
  readonly transactions: readonly StagedTransaction[];
  readonly highConfidenceCount: number;
  /** Formatted period label, e.g. "1–31 Aug 2026 · CSV". */
  readonly periodLabel: string;
}

/** FR-06 — bank import wizard and matching review. */
export function ImportScreen({
  bankImport,
  steps,
  summary,
  transactions,
  highConfidenceCount,
  periodLabel,
}: ImportScreenProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState(transactions);

  const markConfirmed = (ids: readonly string[]): void => {
    setRows((current) =>
      current.map((row) => (ids.includes(row.id) ? { ...row, state: 'confirmed' as const } : row)),
    );
  };

  return (
    <Stack>
      <Card>
        <CardBody>
          <Stepper steps={steps} label="Import progress" />
        </CardBody>
      </Card>

      {bankImport.duplicatesSkipped > 0 ? (
        <Banner
          tone="warn"
          title={`${bankImport.duplicatesSkipped} rows already imported on ${
            bankImport.duplicatesSkippedFromDate ? formatDateShort(bankImport.duplicatesSkippedFromDate) : 'a prior date'
          } were skipped`}
        >
          Matched on date, amount and bank reference. Balances are unchanged.{' '}
          <a
            href="#skipped"
            style={{ color: 'inherit', textDecoration: 'underline' }}
            onClick={(event) => {
              event.preventDefault();
              toast('Skipped-row review is not wired up in this build');
            }}
          >
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

      <StagedTransactionsTable
        rows={rows}
        highConfidenceCount={highConfidenceCount}
        onConfirm={(row) => {
          markConfirmed([row.id]);
          toast(`Confirmed · ${row.rawDescription}`);
        }}
        onChange={(row) => toast(`Re-allocating "${row.rawDescription}" is not wired up in this build`)}
        onConfirmAll={() => {
          const ids = rows.filter((row) => row.state === 'auto-matched').map((row) => row.id);
          markConfirmed(ids);
          toast(`Confirmed ${ids.length} high-confidence rows`);
        }}
      />

      <Sub style={{ fontSize: 12 }}>
        Suggested matches never post on their own. Every accepted row keeps the raw bank text and your correction, with
        who confirmed it and when.
      </Sub>
    </Stack>
  );
}
