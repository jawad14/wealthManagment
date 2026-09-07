'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/shared/components/Icon';
import { APP_NAME, APP_TAGLINE } from '@/shared/config/app-config';
import { NAV_GROUPS, NAV_ITEMS, viewFromPathname } from '@/shared/config/navigation';
import { useNavigation } from './NavigationContext';

export interface SidebarProps {
  /** Live counts for nav badges, resolved on the server and passed down. */
  readonly badges: {
    readonly openObligations: number;
    readonly unmatchedTransactions: number;
    readonly billsNeedingReview: number;
  };
  /** Current scope label shown in the scope pill. */
  readonly scopeLabel: string;
  readonly currentUserName: string;
  readonly currentUserRole: string;
}

export function Sidebar({ badges, scopeLabel, currentUserName, currentUserRole }: SidebarProps) {
  const pathname = usePathname();
  const activeView = viewFromPathname(pathname);
  const { isDrawerOpen, closeDrawer } = useNavigation();

  const initials = currentUserName
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className={isDrawerOpen ? 'sidebar open' : 'sidebar'} id="sidebar" aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark">{APP_NAME.charAt(0)}</div>
        <div>
          <div className="brand-name">{APP_NAME}</div>
          <span className="brand-sub">{APP_TAGLINE}</span>
        </div>
      </div>

      <button className="scope" title="Change scope (entity, property, period)" type="button">
        <div>
          <small>Viewing</small>
          <strong>{scopeLabel}</strong>
        </div>
        <Icon name="i-chev-ud" />
      </button>

      <nav className="nav">
        {NAV_GROUPS.map((group) => (
          <div key={group}>
            <div className="nav-group">{group}</div>
            {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
              const count = item.badge ? badges[item.badge] : undefined;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="nav-item"
                  aria-current={item.key === activeView ? 'page' : undefined}
                  onClick={closeDrawer}
                >
                  <Icon name={item.icon} />
                  {item.label}
                  {count ? <span className="count">{count}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="side-foot">
        <div className="avatar">{initials}</div>
        <div>
          <div>{currentUserName}</div>
          <span className="role">{currentUserRole}</span>
        </div>
      </div>
    </aside>
  );
}
