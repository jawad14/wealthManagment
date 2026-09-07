'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/shared/components/Icon';
import { VIEW_TITLES, viewFromPathname } from '@/shared/config/navigation';
import { formatDateLong } from '@/shared/lib/dates';
import { BASE_CURRENCY } from '@/shared/config/app-config';
import type { IsoDate } from '@/shared/types/common';
import { useNavigation } from './NavigationContext';

export interface TopBarProps {
  readonly asOfDate: IsoDate;
  readonly unreadNotifications: number;
  readonly currentUserInitials: string;
}

export function TopBar({ asOfDate, unreadNotifications, currentUserInitials }: TopBarProps) {
  const pathname = usePathname();
  const { isDrawerOpen, toggleDrawer } = useNavigation();
  const title = VIEW_TITLES[viewFromPathname(pathname)];

  return (
    <header className="topbar">
      <button
        className="menu-btn"
        id="menuBtn"
        aria-label="Open navigation"
        aria-controls="sidebar"
        aria-expanded={isDrawerOpen}
        onClick={toggleDrawer}
        type="button"
      >
        <Icon name="i-menu" />
      </button>

      <h1 className="page-title" id="pageTitle">
        {title}
      </h1>

      <div className="asof">
        <Icon name="i-clock" size={14} />
        As of <b>{formatDateLong(asOfDate)}</b> · {BASE_CURRENCY}
      </div>

      <label className="search">
        <Icon name="i-search" />
        <input placeholder="Search properties, tenants, documents…" aria-label="Search" />
      </label>

      <button className="icon-btn" aria-label={`Notifications, ${unreadNotifications} unread`} type="button">
        <Icon name="i-bell" />
        {unreadNotifications > 0 ? <span className="dot" /> : null}
      </button>

      <button className="icon-btn hide-m" aria-label="Account" type="button">
        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
          {currentUserInitials}
        </div>
      </button>
    </header>
  );
}
