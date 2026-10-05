'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const COLLAPSED_STORAGE_KEY = 'rm-admin-sidebar-collapsed';
/** Below this width (tablets, small laptops) the sidebar stays icon-only to leave room for tables. */
const LARGE_SCREEN_QUERY = '(min-width: 1280px)';

type SidebarContextValue = {
  /** Mobile drawer (below md). */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** User preference on large screens. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Icons only: collapsed on large screens, always on tablets. */
  iconOnly: boolean;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar doit être utilisé dans AdminShell');
  }
  return ctx;
}

function subscribeToLargeScreen(onChange: () => void) {
  const media = window.matchMedia(LARGE_SCREEN_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function useIsLargeScreen(): boolean {
  return useSyncExternalStore(
    subscribeToLargeScreen,
    () => window.matchMedia(LARGE_SCREEN_QUERY).matches,
    () => true,
  );
}

function readCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    typeof window === 'undefined' ? false : readCollapsedPreference(),
  );
  const isLargeScreen = useIsLargeScreen();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Preference is optional (private mode, storage disabled).
      }
      return next;
    });
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      mobileOpen,
      setMobileOpen,
      collapsed,
      toggleCollapsed,
      iconOnly: collapsed || !isLargeScreen,
    }),
    [mobileOpen, collapsed, toggleCollapsed, isLargeScreen],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
