import type { Metadata } from 'next';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Grid, Stack } from '@/shared/components/Layout';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { dashboardService } from '@/modules/dashboard/service';
import { obligationsService } from '@/modules/obligations/service';
import { DashboardKpis } from '@/modules/dashboard/components/DashboardKpis';
import { AttentionStrip } from '@/modules/dashboard/components/AttentionStrip';
import { CashFlowChart } from '@/modules/dashboard/components/CashFlowChart';
import { UpcomingList } from '@/modules/dashboard/components/UpcomingList';
import { ArrearsTable } from '@/modules/dashboard/components/ArrearsTable';
import { OwnershipView } from '@/modules/dashboard/components/OwnershipView';

export const metadata: Metadata = { title: 'Dashboard · Holdfast' };

/** FR-09 — portfolio overview. Rendered on the server from live module reads. */
export default function DashboardPage() {
  const asOf = resolveAsOfDate();
  const overview = dashboardService.overview(asOf);

  return (
    <Stack>
      <DashboardKpis
        netWorth={overview.netWorth}
        monthlyCash={overview.monthlyCash}
        arrears={overview.arrears}
        upcoming={overview.upcomingSummary}
      />

      <AttentionStrip items={overview.attention} />

      <Grid columns={2}>
        <Card>
          <CardHeader
            title="Cash flow · last 6 months"
            aside={
              <div className="legend">
                <span>
                  <i style={{ background: 'var(--bar)' }} />
                  Receipts
                </span>
                <span>
                  <i style={{ background: 'var(--gold)' }} />
                  Outgoings
                </span>
              </div>
            }
          />
          <CardBody>
            <CashFlowChart points={overview.cashFlow} note={overview.cashFlowNote} />
          </CardBody>
        </Card>

        <UpcomingList items={overview.upcoming} totalCount={obligationsService.openCount(asOf)} />
      </Grid>

      <Grid columns={2}>
        <ArrearsTable positions={overview.arrearsPositions} />
        <OwnershipView positions={overview.ownership} />
      </Grid>
    </Stack>
  );
}
