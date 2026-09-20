'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/shared/components/Icon';
import { VIEW_TITLES, viewFromPathname } from '@/shared/config/navigation';
import { formatDateLong } from '@/shared/lib/dates';
import { BASE_CURRENCY } from '@/shared/config/app-config';
import type { IsoDate } from '@/shared/types/common';
import { GlobalSearch } from './GlobalSearch';
import { useNavigation } from './NavigationContext';
import { UserMenu, type SwitchUserAction, type UserMenuPersona } from './UserMenu';

export interface TopBarProps {
  readonly asOfDate: IsoDate;
  readonly unreadNotifications: number;
  readonly currentUserInitials: string;
  readonly currentUserName: string;
  /** The bare role name for the account menu chip, e.g. "Portfolio owner". */
  readonly currentUserRoleLabel: string;
  readonly personas: readonly UserMenuPersona[];
  readonly switchUserAction: SwitchUserAction;
}

export function TopBar({
  asOfDate,
  unreadNotifications,
  currentUserInitials,
  currentUserName,
  currentUserRoleLabel,
  personas,
  switchUserAction,
}: TopBarProps) {
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

      <GlobalSearch />

      <button className="icon-btn" aria-label={`Notifications, ${unreadNotifications} unread`} type="button">
        <Icon name="i-bell" />
        {unreadNotifications > 0 ? <span className="dot" /> : null}
      </button>

      <UserMenu
        currentUserName={currentUserName}
        currentUserRoleLabel={currentUserRoleLabel}
        currentUserInitials={currentUserInitials}
        personas={personas}
        switchUserAction={switchUserAction}
      />
    </header>
  );
}
