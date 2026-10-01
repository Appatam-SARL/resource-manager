'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';
import { AppLoadingScreen } from '@/components/shared/loading-state';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { clearSession } from '@/lib/api';
import { canAccessRoute } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useRealtimeSync(isLoading ? undefined : user?.id);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      // A leftover auth cookie without a stored session would make the middleware
      // bounce /login back to /dashboard forever.
      clearSession();
      router.replace('/login');
      return;
    }
    if (!canAccessRoute(user.role, pathname)) {
      router.replace('/403');
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return <AppLoadingScreen label="Chargement de la session…" />;
  }

  if (!canAccessRoute(user.role, pathname)) {
    return <AppLoadingScreen label="Redirection…" />;
  }

  return <AdminShell>{children}</AdminShell>;
}
