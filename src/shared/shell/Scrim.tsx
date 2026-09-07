'use client';

import { useNavigation } from './NavigationContext';

/** Dimmed overlay behind the mobile drawer; clicking it closes the drawer. */
export function Scrim() {
  const { isDrawerOpen, closeDrawer } = useNavigation();
  return (
    <div
      className={isDrawerOpen ? 'scrim show' : 'scrim'}
      id="scrim"
      onClick={closeDrawer}
      aria-hidden="true"
    />
  );
}
