import type { KeyboardEvent } from 'react';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { formatMoney, type Money } from '@/shared/lib/money';
import type { EntityId } from '@/shared/types/common';
import type { EntityKind } from '../model';
import type { EntityWithRelationships } from '../service';

/** Icon tint per entity kind, matching the design's `.ent-ic` variants. */
export const KIND_CLASS: Record<EntityKind, string> = {
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

export interface EntityListProps {
  readonly rows: readonly EntityRow[];
  readonly selectedId?: EntityId;
  /** Makes rows selectable; each row then behaves as a toggle button. */
  readonly onSelect?: (id: EntityId) => void;
}

/** FR-01 — entities with their dated relationships and consolidated value. */
export function EntityList({ rows, selectedId, onSelect }: EntityListProps) {
  return (
    <Card>
      {rows.map(({ entry, value }) => {
        const selected = entry.entity.id === selectedId;
        return (
          <div
            className="ent"
            key={entry.entity.id}
            {...(onSelect
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-pressed': selected,
                  style: { cursor: 'pointer', ...(selected ? { background: 'var(--surface-2)' } : {}) },
                  onClick: () => onSelect(entry.entity.id),
                  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(entry.entity.id);
                    }
                  },
                }
              : {})}
          >
            <div className={`ent-ic ${KIND_CLASS[entry.entity.kind]}`}>{entry.entity.monogram}</div>

            <div className="ent-main">
              <b>{entry.entity.name}</b>
              <Chip tone="neutral">{entry.entity.descriptor}</Chip>
              {/* Selection is never colour alone: the chip says it in words. */}
              {selected ? (
                <>
                  {' '}
                  <Chip tone="info" icon="i-check">
                    Selected
                  </Chip>
                </>
              ) : null}

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
        );
      })}
    </Card>
  );
}
