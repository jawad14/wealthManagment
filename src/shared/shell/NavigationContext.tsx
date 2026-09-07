'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface NavigationState {
  readonly isDrawerOpen: boolean;
  readonly openDrawer: () => void;
  readonly closeDrawer: () => void;
  readonly toggleDrawer: () => void;
}

const NavigationContext = createContext<NavigationState | null>(null);

/**
 * Holds the mobile drawer state. Kept in context so the top bar's menu button,
 * the scrim, the sidebar and the "More" tab can all drive the same drawer.
 */
export function NavigationProvider({ children }: { readonly children: ReactNode }) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((open) => !open), []);

  const value = useMemo(
    () => ({ isDrawerOpen, openDrawer, closeDrawer, toggleDrawer }),
    [isDrawerOpen, openDrawer, closeDrawer, toggleDrawer],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationState {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used inside <NavigationProvider>.');
  return context;
}
