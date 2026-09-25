'use client';

import type { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { PageTransition } from '@/components/motion/page-transition';
import { FadeIn } from '@/components/motion';

export { useSidebar } from '@/components/layout/sidebar-context';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#F3F4F6] p-3 md:p-4">
        <div className="flex gap-4">
          <FadeIn delay={0.05} y={0}>
            <Sidebar />
          </FadeIn>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <FadeIn delay={0.08} y={-6}>
              <Header />
            </FadeIn>
            <main className="min-h-[70vh] rounded-3xl bg-transparent">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
