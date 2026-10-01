'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { Bell, Building2, GitBranch, Globe2, LogOut, Search } from 'lucide-react';
import { isMacPlatform, useCommandMenu } from '@/components/layout/command-menu';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-notifications';
import { displayName, ROLE_LABELS } from '@/lib/rbac';
import { formatBuildLabel, getBrowserRuntimeConfig } from '@/lib/runtime-config';
import { useAuth } from '@/providers/auth-provider';

type UserMenuProps = {
  trigger: ReactElement;
  side?: 'top' | 'bottom' | 'right';
  align?: 'start' | 'end';
};

function ScopeLine({ icon: Icon, children }: { icon: typeof Building2; children: string }) {
  return (
    <p className="flex items-center gap-2 text-[13px] text-foreground">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate">{children}</span>
    </p>
  );
}

export function UserMenu({ trigger, side = 'bottom', align = 'end' }: UserMenuProps) {
  const { user, logout } = useAuth();
  const { open: openCommandMenu } = useCommandMenu();
  const unreadCount = useUnreadNotificationsCount().data ?? 0;
  if (!user) return null;

  const isGroupAdmin = user.role === 'GROUP_ADMIN';
  // The menu content only renders after a click, so reading the browser config cannot cause a hydration mismatch.
  const buildConfig = getBrowserRuntimeConfig();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent side={side} align={align} sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2">
            <UserAvatar firstName={user.firstName} lastName={user.lastName} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">{displayName(user)}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            Périmètre
            <span className="font-normal text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </DropdownMenuLabel>
          <div className="space-y-1 px-2 pb-2">
            {isGroupAdmin ? <ScopeLine icon={Globe2}>Toutes les entreprises du Groupe</ScopeLine> : null}
            <ScopeLine icon={Building2}>{user.company.name}</ScopeLine>
            {user.direction ? <ScopeLine icon={GitBranch}>{user.direction.name}</ScopeLine> : null}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={openCommandMenu}>
            <Search aria-hidden />
            Rechercher
            <DropdownMenuShortcut>{isMacPlatform() ? '⌘K' : 'Ctrl K'}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/notifications" />}>
            <Bell aria-hidden />
            Notifications
            {unreadCount > 0 ? <DropdownMenuShortcut>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</DropdownMenuShortcut> : null}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
          <LogOut aria-hidden />
          Se déconnecter
        </DropdownMenuItem>
        {buildConfig ? (
          <p className="px-2 pt-1.5 pb-1 font-mono text-[11px] text-muted-foreground">
            {formatBuildLabel(buildConfig)}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
