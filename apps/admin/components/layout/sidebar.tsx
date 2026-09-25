'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building,
  Building2,
  CalendarDays,
  Car,
  ClipboardList,
  DoorOpen,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useSidebar } from '@/components/layout/sidebar-context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  displayName,
  organizationContext,
  ROLE_LABELS,
  visibleMenuItems,
} from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';
import { cn } from 'cn';
import { motion, useReducedMotion } from 'motion/react';

const MENU_ICONS: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/group': Building,
  '/companies': Building2,
  '/directions': GitBranch,
  '/users': Users,
  '/vehicles': Car,
  '/rooms': DoorOpen,
  '/reservations': CalendarDays,
  '/calendar': CalendarDays,
  '/notifications': Bell,
  '/audit': ClipboardList,
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { open, setOpen } = useSidebar();
  const reduceMotion = useReducedMotion();

  if (!user) return null;

  const items = visibleMenuItems(user.role);
  const name = displayName(user);
  const org = organizationContext(user);
  const isGroupAdmin = user.role === 'GROUP_ADMIN';
  const settingsHref = isGroupAdmin ? '/group' : '/dashboard';

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
            RM
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Resource Manager
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fermer le menu"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-2xl bg-secondary/60 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{org.company}</p>
          {user.direction ? (
            <p className="truncate text-xs text-muted-foreground">
              {org.direction}
            </p>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Menu
        </p>
        <ul className="space-y-1">
          {items.map((item, index) => {
            const Icon = MENU_ICONS[item.href] ?? LayoutDashboard;
            const active = isActivePath(pathname, item.href);
            return (
              <motion.li
                key={item.href}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * index, duration: 0.25 }}
              >
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-secondary text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId={reduceMotion ? undefined : 'sidebar-active'}
                      aria-hidden
                      className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                    />
                  ) : null}
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </motion.li>
            );
          })}
        </ul>

        <Separator className="my-4" />

        <p className="mb-2 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Général
        </p>
        <ul className="space-y-1">
          <li>
            <Link
              href={settingsHref}
              onClick={() => setOpen(false)}
              aria-disabled={!isGroupAdmin}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isGroupAdmin
                  ? isActivePath(pathname, '/group')
                    ? 'bg-secondary text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  : 'cursor-not-allowed text-muted-foreground/50',
              )}
            >
              <Settings className="size-4 shrink-0" />
              <span>Paramètres</span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                void logout();
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4 shrink-0" />
              <span>Déconnexion</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-3 left-3 z-50 w-[272px] rounded-3xl bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-border/60 transition-transform duration-200 lg:sticky lg:top-4 lg:inset-y-auto lg:left-auto lg:z-auto lg:h-[calc(100vh-2rem)] lg:translate-x-0 lg:self-start',
          open ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0',
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
