'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar doit être utilisé dans AdminShell');
  }
  return ctx;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({ open, setOpen, toggle }),
    [open, toggle],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}
