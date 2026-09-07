'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/shared/components/Icon';
import { TAB_FOR_VIEW, TAB_ITEMS, viewFromPathname } from '@/shared/config/navigation';
import { useNavigation } from './NavigationContext';

/**
 * Bottom tab bar, visible only at ≤840px. The "More" tab has no route of its
 * own — it opens the drawer holding the full grouped navigation.
 */
export function TabBar() {
  const pathname = usePathname();
  const activeTab = TAB_FOR_VIEW[viewFromPathname(pathname)];
  const { openDrawer } = useNavigation();

  return (
    <nav className="tabbar" aria-label="Primary">
      {TAB_ITEMS.map((tab) => {
        const isCurrent = tab.key === activeTab;
        const content = (
          <>
            <Icon name={tab.icon} />
            {tab.label}
          </>
        );

        return tab.href === null ? (
          <button key={tab.key} type="button" aria-current={isCurrent ? 'page' : undefined} onClick={openDrawer}>
            {content}
          </button>
        ) : (
          <Link key={tab.key} href={tab.href} aria-current={isCurrent ? 'page' : undefined}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
