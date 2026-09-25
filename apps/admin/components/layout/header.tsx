'use client';

import Link from 'next/link';
import { Bell, Menu, Search } from 'lucide-react';
import { useSidebar } from '@/components/layout/sidebar-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { displayName, organizationContext, ROLE_LABELS } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

export function Header() {
  const { user } = useAuth();
  const { toggle } = useSidebar();
  const notificationsQuery = useNotifications(1, 20);

  if (!user) return null;

  const name = displayName(user);
  const org = organizationContext(user);
  const unreadCount =
    notificationsQuery.data?.data.filter((n) => !n.readAt).length ?? 0;

  return (
    <header className="flex items-center gap-3 rounded-3xl bg-card px-3 py-3 shadow-sm ring-1 ring-border/60 md:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={toggle}
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </Button>

      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher…"
          className="h-10 rounded-2xl border-transparent bg-muted/70 pr-3 pl-9 focus-visible:bg-background"
          aria-label="Rechercher"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative shrink-0 rounded-2xl"
        render={<Link href="/notifications" />}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} non lues)`
            : 'Notifications'
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      <div className="hidden items-center gap-3 border-l border-border pl-3 sm:flex">
        <Avatar size="default" className="bg-secondary">
          <AvatarFallback className="bg-secondary font-medium text-primary">
            {initials(user.firstName, user.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {ROLE_LABELS[user.role]} · {org.company}
            {org.direction !== 'Aucune direction' ? ` · ${org.direction}` : ''}
          </p>
        </div>
      </div>
    </header>
  );
}
