import Link from 'next/link';
import { Icon } from '@/shared/components/Icon';
import type { AttentionItem } from '../model';

/**
 * The row of actionable gaps under the KPI tiles.
 * Each tile links to the screen where the item can be resolved.
 */
export function AttentionStrip({ items }: { readonly items: readonly AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="attn" role="group" aria-label="Needs attention">
      {items.map((item) => (
        <Link key={item.id} href={item.href} className="attn-item">
          <div className={`attn-ic ${item.tone}`}>
            <Icon name={item.icon} />
          </div>
          <div>
            <b>{item.title}</b>
            <span>{item.detail}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
