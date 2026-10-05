'use client';

import type { ReactNode } from 'react';
import { CommandMenuProvider } from '@/components/layout/command-menu';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { PageTransition } from '@/components/motion/page-transition';

export { useSidebar } from '@/components/layout/sidebar-context';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <CommandMenuProvider>
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Aller au contenu
        </a>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main
              id="main-content"
              className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8"
            >
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </CommandMenuProvider>
    </SidebarProvider>
  );
}
