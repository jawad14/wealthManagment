import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { formatMoney, type Money } from '@/shared/lib/money';
import type { EntityKind } from '../model';
import type { EntityWithRelationships } from '../service';

/** Icon tint per entity kind, matching the design's `.ent-ic` variants. */
const KIND_CLASS: Record<EntityKind, string> = {
  individual: 'person',
  company: 'company',
  trust: 'trust',
  smsf: 'smsf',
};

export interface EntityRow {
  readonly entry: EntityWithRelationships;
  /** Net consolidated position, or null when the entity is not consolidated. */
  readonly value: Money | null;
}

/** FR-01 — entities with their dated relationships and consolidated value. */
export function EntityList({ rows }: { readonly rows: readonly EntityRow[] }) {
  return (
    <Card>
      {rows.map(({ entry, value }) => (
        <div className="ent" key={entry.entity.id}>
          <div className={`ent-ic ${KIND_CLASS[entry.entity.kind]}`}>{entry.entity.monogram}</div>

          <div className="ent-main">
            <b>{entry.entity.name}</b>
            <Chip tone="neutral">{entry.entity.descriptor}</Chip>

            <div className="rel">
              {entry.relationshipLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            {entry.entity.consolidationNote ? (
              <div style={{ marginTop: 6 }}>
                {entry.entity.consolidation === 'look-through' ? (
                  <Chip tone="good" icon="i-check">
                    {entry.entity.consolidationNote}
                  </Chip>
                ) : (
                  <Chip tone="warn" icon="i-alert">
                    {entry.entity.consolidationNote}
                  </Chip>
                )}{' '}
                {entry.entity.kind === 'trust' ? <Chip tone="neutral">Beneficiaries not assigned %</Chip> : null}
              </div>
            ) : null}
          </div>

          <div className="ent-side">
            <b className="num">{value === null ? '$—' : formatMoney(value)}</b>
            <span>{entry.entity.valueNote}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}
