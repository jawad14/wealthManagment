import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { Banner } from '@/shared/components/Banner';
import { Kpi, KpiGrid } from '@/shared/components/Kpi';
import { Stack, Sub } from '@/shared/components/Layout';
import { formatMoney } from '@/shared/lib/money';
import { formatDateLong } from '@/shared/lib/dates';
import type { Explanation, ExplanationLine } from '../explain';

const columns: readonly DataTableColumn<ExplanationLine>[] = [
  {
    header: 'Record',
    lead: true,
    render: (line) => (
      <>
        <CellMain>{line.href ? <Link href={line.href}>{line.label}</Link> : line.label}</CellMain>
        <CellSub>{line.source}</CellSub>
      </>
    ),
  },
  {
    header: 'Note',
    render: (line) =>
      line.caveat ? (
        <Chip tone="warn" icon="i-alert">
          {line.caveat}
        </Chip>
      ) : (
        <Sub>—</Sub>
      ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (line) => (
      <span className="num" style={line.isDeduction ? { color: 'var(--bad)' } : undefined}>
        {line.isDeduction ? '−' : ''}
        {formatMoney(line.amount, { showCents: true })}
      </span>
    ),
  },
];

/**
 * FR-09 drill-down — the records behind a total.
 *
 * The reconciliation banner is the point of the screen: it states out loud
 * whether the lines add up to the headline figure, rather than leaving the
 * reader to add them up and hope.
 */
export function ExplainScreen({ explanation }: { readonly explanation: Explanation }) {
  return (
    <Stack>
      <KpiGrid>
        <Kpi
          accent
          wide
          label={explanation.label}
          value={formatMoney(explanation.total)}
          valueSuffix={`as of ${formatDateLong(explanation.asOf)}`}
          footer={`${explanation.lines.length} contributing record${explanation.lines.length === 1 ? '' : 's'}`}
        />
        <Kpi
          label="Export"
          value={<span style={{ fontSize: 15 }}>CSV</span>}
          footer={
            <a href={`/api/exports/${explanation.metric}?asOf=${explanation.asOf}`}>
              Download supporting records
            </a>
          }
        />
      </KpiGrid>

      {explanation.reconciles ? (
        <Banner tone="info" icon="i-check" title="These records reconcile to the total exactly">
          {explanation.rule}
        </Banner>
      ) : (
        <Banner tone="warn" title="These records do not reconcile to the total">
          Investigate before relying on this figure. {explanation.rule}
        </Banner>
      )}

      <Card>
        <CardHeader title="Supporting records" aside={<Sub>Every line names its own source</Sub>} />
        <DataTable
          columns={columns}
          rows={explanation.lines}
          rowKey={(line) => line.id}
          empty="No records contribute to this total."
        />
        <CardBody style={{ borderTop: '1px solid var(--line-2)' }}>
          <Sub style={{ fontSize: 12 }}>
            An exported copy carries the same permissions as this screen, and the same rule and total as its header.
          </Sub>
        </CardBody>
      </Card>
    </Stack>
  );
}
