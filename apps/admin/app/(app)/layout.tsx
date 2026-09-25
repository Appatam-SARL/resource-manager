'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';
import { LoadingState } from '@/components/shared/loading-state';
import { canAccessRoute } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canAccessRoute(user.role, pathname)) {
      router.replace('/403');
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
        <LoadingState label="Chargement de la session…" />
      </div>
    );
  }

  if (!canAccessRoute(user.role, pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
        <LoadingState label="Redirection…" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
