import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { CellMain, DataTable, Num } from '@/shared/components/DataTable';
import { Stat, Sub } from '@/shared/components/Layout';
import { formatMoney } from '@/shared/lib/money';
import type { Entity } from '../model';
import type { EntityHolding, EntityHoldings } from '../service';
import { KIND_CLASS } from './EntityList';

export interface EntityBreakdownCardProps {
  readonly entity: Entity;
  readonly holdings: EntityHoldings;
}

/** FR-01, BR-02 — the selected entity's attributed assets, debt and equity. */
export function EntityBreakdownCard({ entity, holdings }: EntityBreakdownCardProps) {
  return (
    <Card>
      <CardHeader style={{ justifyContent: 'flex-start', gap: 12 }}>
        <div className={`ent-ic ${KIND_CLASS[entity.kind]}`}>{entity.monogram}</div>
        <div>
          <h3>{entity.name}</h3>
          <Chip tone="neutral">{entity.descriptor}</Chip>
        </div>
      </CardHeader>

      <CardBody className="grid g3">
        <Stat label="Attributed assets" value={<Num>{formatMoney(holdings.grossAssets)}</Num>} />
        <Stat label="Attributed debt" value={<Num>{formatMoney(holdings.attributedDebt)}</Num>} />
        <Stat label="Net equity" value={<Num>{formatMoney(holdings.netEquity)}</Num>} />
      </CardBody>

      <DataTable<EntityHolding>
        rows={holdings.holdings}
        rowKey={(holding) => holding.propertyId}
        empty="No property interests recorded for this entity."
        columns={[
          {
            header: 'Property',
            lead: true,
            render: (holding) => (
              <Link href={`/properties/${holding.propertyId}`}>
                <CellMain>{holding.propertyName}</CellMain>
              </Link>
            ),
          },
          { header: 'Share', align: 'right', render: (holding) => <Num>{`${holding.sharePercent}%`}</Num> },
          {
            header: 'Proportional value',
            mobileLabel: 'Value',
            align: 'right',
            render: (holding) => <Num>{formatMoney(holding.attributedValue)}</Num>,
          },
          { header: 'Debt', align: 'right', render: (holding) => <Num>{formatMoney(holding.debt)}</Num> },
        ]}
      />

      <CardBody>
        <Sub style={{ fontSize: 12 }}>
          Property interests only. Debt follows the named borrower, so it can include a facility secured on a
          property this entity does not own.
        </Sub>
      </CardBody>
    </Card>
  );
}
