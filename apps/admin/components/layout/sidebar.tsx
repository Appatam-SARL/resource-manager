'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsUpDown, LayoutDashboard } from 'lucide-react';
import { getNavSections, isActivePath, NAV_ICONS } from '@/components/layout/navigation';
import { useSidebar } from '@/components/layout/sidebar-context';
import { UserMenu } from '@/components/layout/user-menu';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NavItem } from '@/lib/rbac';
import { displayName, ROLE_LABELS } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';
import { cn } from 'cn';

function Brand({ iconOnly }: { iconOnly: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'flex h-14 shrink-0 items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        iconOnly ? 'justify-center' : 'px-2',
      )}
      aria-label="Resource Manager — Tableau de bord"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold tracking-wide text-primary-foreground">
        RM
      </span>
      {iconOnly ? null : (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-semibold tracking-tight text-foreground">
            Resource Manager
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">Administration</span>
        </span>
      )}
    </Link>
  );
}

function NavLink({
  item,
  active,
  iconOnly,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  iconOnly: boolean;
  onNavigate?: () => void;
}) {
  const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
  const className = cn(
    'group relative flex h-8 items-center gap-2.5 rounded-md text-[13.5px] transition-colors duration-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
    iconOnly ? 'mx-auto w-9 justify-center' : 'px-2.5',
    active
      ? 'bg-sidebar-accent font-medium text-foreground'
      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
  );
  const content = (
    <>
      {active ? (
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 -left-3 w-[2px] rounded-r-full bg-primary"
        />
      ) : null}
      <Icon
        className={cn(
          'size-4 shrink-0 transition-colors',
          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
        strokeWidth={active ? 2.25 : 2}
        aria-hidden
      />
      {iconOnly ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </>
  );

  if (!iconOnly) {
    return (
      <Link href={item.href} onClick={onNavigate} className={className} aria-current={active ? 'page' : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link href={item.href} onClick={onNavigate} className={className} aria-current={active ? 'page' : undefined} />
        }
      >
        {content}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarContent({ iconOnly, onNavigate }: { iconOnly: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  const sections = getNavSections(user.role);

  return (
    <div className="flex h-full flex-col">
      <div className={cn('border-b border-sidebar-border', iconOnly ? 'px-2' : 'px-3')}>
        <Brand iconOnly={iconOnly} />
      </div>

      <nav
        aria-label="Navigation principale"
        className={cn('scrollbar-thin flex-1 overflow-y-auto pt-3 pb-4', iconOnly ? 'px-2' : 'px-3')}
      >
        {sections.map((section, index) => (
          <div key={section.id} className={cn(index > 0 && (iconOnly ? 'mt-3' : 'mt-5'))}>
            {iconOnly ? (
              index > 0 ? <div className="mx-3 mb-3 border-t border-sidebar-border" aria-hidden /> : null
            ) : (
              <p className="type-eyebrow mb-1 px-2.5 text-[10.5px] text-muted-foreground/75">{section.label}</p>
            )}
            <ul className="space-y-px" aria-label={iconOnly ? section.label : undefined}>
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={isActivePath(pathname, item.href)}
                    iconOnly={iconOnly}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-sidebar-border py-2', iconOnly ? 'px-2' : 'px-3')}>
        <UserMenu
          side={iconOnly ? 'right' : 'top'}
          align={iconOnly ? 'end' : 'start'}
          trigger={
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-popup-open:bg-sidebar-accent',
                iconOnly && 'justify-center',
              )}
              aria-label={`Compte : ${displayName(user)}`}
            >
              <UserAvatar firstName={user.firstName} lastName={user.lastName} />
              {iconOnly ? null : (
                <>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-medium text-foreground">{displayName(user)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </>
              )}
            </button>
          }
        />
      </div>
    </div>
  );
}

export function Sidebar() {
  const { iconOnly, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:block',
          iconOnly ? 'w-[60px]' : 'w-60',
        )}
      >
        <SidebarContent iconOnly={iconOnly} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0 sm:max-w-72" showCloseButton={false}>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent iconOnly={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
