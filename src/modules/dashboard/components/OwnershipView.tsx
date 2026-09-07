import { formatMoney } from '@/shared/lib/money';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Sub } from '@/shared/components/Layout';
import type { OwnershipPosition } from '../model';

/** Bar fills cycle through the design's three neutral/accent tones. */
const BAR_COLOURS = ['var(--bar)', 'var(--gold)', 'var(--info)'] as const;

/**
 * Look-through consolidation summary (BR-02).
 *
 * The closing note is load-bearing, not decoration: it tells the reader why a
 * company's equity does not appear on top of the properties it owns.
 */
export function OwnershipView({ positions }: { readonly positions: readonly OwnershipPosition[] }) {
  return (
    <Card>
      <CardHeader title="Ownership view" aside={<Sub>Look-through consolidation</Sub>} />
      <CardBody>
        <div className="stack">
          {positions.map((position, index) => (
            <div key={position.entityId} style={index === 0 ? undefined : { marginTop: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                <span>{position.entityName}</span>
                <b className="num">{formatMoney(position.net)}</b>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: 'var(--line-2)',
                  marginTop: 6,
                  overflow: 'hidden',
                }}
              >
                <i
                  style={{
                    display: 'block',
                    width: `${Math.max(0, Math.min(100, position.shareOfTotal * 100))}%`,
                    height: '100%',
                    background: BAR_COLOURS[index % BAR_COLOURS.length],
                  }}
                />
              </div>
            </div>
          ))}
          <p className="sub" style={{ margin: '14px 0 0', fontSize: 12 }}>
            Each asset counted once at your ownership share. Company equity is not added on top of its underlying
            properties (BR-02).
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
