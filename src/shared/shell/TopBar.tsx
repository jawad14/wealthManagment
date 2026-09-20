'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@/shared/components/Icon';
import { VIEW_TITLES, viewFromPathname } from '@/shared/config/navigation';
import { formatDateLong } from '@/shared/lib/dates';
import { BASE_CURRENCY } from '@/shared/config/app-config';
import type { IsoDate } from '@/shared/types/common';
import type { NotificationItem } from '@/shared/types/notifications';
import { GlobalSearch } from './GlobalSearch';
import { useNavigation } from './NavigationContext';
import { NotificationsDrawer } from './NotificationsDrawer';
import { UserMenu, type SwitchUserAction, type UserMenuPersona } from './UserMenu';

export interface TopBarProps {
  readonly asOfDate: IsoDate;
  /** Already permission-filtered on the server; the shell only renders them. */
  readonly notifications: readonly NotificationItem[];
  readonly currentUserInitials: string;
  readonly currentUserName: string;
  /** The bare role name for the account menu chip, e.g. "Portfolio owner". */
  readonly currentUserRoleLabel: string;
  readonly personas: readonly UserMenuPersona[];
  readonly switchUserAction: SwitchUserAction;
}

export function TopBar({
  asOfDate,
  notifications,
  currentUserInitials,
  currentUserName,
  currentUserRoleLabel,
  personas,
  switchUserAction,
}: TopBarProps) {
  const pathname = usePathname();
  const { isDrawerOpen, toggleDrawer } = useNavigation();
  const title = VIEW_TITLES[viewFromPathname(pathname)];

  const [isOpen, setIsOpen] = useState(false);
  // Held in memory only: a reload brings back anything still unresolved.
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
  const bellRootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();
  const unreadNotifications = notifications.filter((item) => !readIds.has(item.id)).length;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      bellRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (!bellRootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

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

      <div ref={bellRootRef} style={{ position: 'relative' }}>
        <button
          ref={bellRef}
          className="icon-btn"
          aria-label={`Notifications, ${unreadNotifications} unread`}
          aria-expanded={isOpen}
          aria-controls={drawerId}
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          <Icon name="i-bell" />
          {unreadNotifications > 0 ? <span className="dot" /> : null}
        </button>

        <NotificationsDrawer
          id={drawerId}
          isOpen={isOpen}
          items={notifications}
          readIds={readIds}
          onMarkAllRead={() => setReadIds(new Set(notifications.map((item) => item.id)))}
          onClose={() => setIsOpen(false)}
        />
      </div>

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
