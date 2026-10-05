'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { isMacPlatform, useCommandMenu } from '@/components/layout/command-menu';
import { getBreadcrumbs } from '@/components/layout/navigation';
import { useSidebar } from '@/components/layout/sidebar-context';
import { UserMenu } from '@/components/layout/user-menu';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-notifications';
import { displayName } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);
  return (
    <nav aria-label="Fil d’Ariane" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 text-[13.5px]">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? (
                <li aria-hidden className="text-muted-foreground/50">
                  /
                </li>
              ) : null}
              <li className="min-w-0">
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="block truncate font-medium text-foreground" aria-current={last ? 'page' : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

function NotificationsButton() {
  const unreadCountQuery = useUnreadNotificationsCount();
  const unreadCount = unreadCountQuery.data ?? 0;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href="/notifications"
            className={buttonVariants({
              variant: 'ghost',
              size: 'icon',
              className: 'relative text-muted-foreground hover:text-foreground',
            })}
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : 'Notifications'}
          />
        }
      >
        <Bell className="size-[17px]" />
        {unreadCount > 0 ? (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums ring-2 ring-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
      </TooltipContent>
    </Tooltip>
  );
}

export function Header() {
  const { user } = useAuth();
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();
  const { open: openCommandMenu } = useCommandMenu();

  if (!user) return null;

  const shortcut = isMacPlatform() ? '⌘K' : 'Ctrl K';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-background/90 px-3 backdrop-blur-sm md:px-5 lg:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </Button>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="-ml-1.5 hidden text-muted-foreground xl:inline-flex"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
              aria-pressed={collapsed}
            />
          }
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </TooltipTrigger>
        <TooltipContent side="bottom">{collapsed ? 'Déplier le menu' : 'Réduire le menu'}</TooltipContent>
      </Tooltip>

      <div className="min-w-0 flex-1 px-1 xl:pl-2">
        <Breadcrumbs />
      </div>

      <button
        type="button"
        onClick={openCommandMenu}
        className="mr-1 hidden h-8 w-56 items-center gap-2 rounded-md border border-transparent bg-muted/80 px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:flex lg:w-64"
        aria-label={`Rechercher (${shortcut})`}
      >
        <Search className="size-3.5" aria-hidden />
        <span className="flex-1 text-left">Rechercher…</span>
        <kbd className="rounded border border-border bg-card px-1.5 py-px font-sans text-[10.5px] font-medium text-muted-foreground">
          {shortcut}
        </kbd>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground md:hidden"
        onClick={openCommandMenu}
        aria-label="Rechercher"
      >
        <Search className="size-4" />
      </Button>

      <NotificationsButton />

      {/* From md the account menu is in the sidebar. */}
      <UserMenu
        trigger={
          <button
            type="button"
            className="ml-0.5 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden"
            aria-label={`Compte : ${displayName(user)}`}
          >
            <UserAvatar firstName={user.firstName} lastName={user.lastName} />
          </button>
        }
      />
    </header>
  );
}
