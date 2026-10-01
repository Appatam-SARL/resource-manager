import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Car,
  DoorOpen,
  GitBranch,
  LayoutDashboard,
  ScrollText,
  Users,
} from 'lucide-react';
import type { Role } from '@resource-manager/types';
import { MENU_ITEMS, visibleMenuItems, type NavItem } from '@/lib/rbac';

export const NAV_ICONS: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/reservations': CalendarCheck2,
  '/calendar': CalendarDays,
  '/vehicles': Car,
  '/rooms': DoorOpen,
  '/group': Building,
  '/companies': Building2,
  '/directions': GitBranch,
  '/users': Users,
  '/notifications': Bell,
  '/audit': ScrollText,
};

const SECTIONS: { id: string; label: string; hrefs: string[] }[] = [
  { id: 'overview', label: 'Vue d’ensemble', hrefs: ['/dashboard'] },
  { id: 'operations', label: 'Opérations', hrefs: ['/reservations', '/calendar', '/vehicles', '/rooms'] },
  { id: 'organization', label: 'Organisation', hrefs: ['/group', '/companies', '/directions', '/users'] },
  { id: 'system', label: 'Système', hrefs: ['/notifications', '/audit'] },
];

export type NavSection = { id: string; label: string; items: NavItem[] };

/** Menu grouped by section; UI only, the API remains the authority on permissions. */
export function getNavSections(role: Role): NavSection[] {
  const visible = new Map(visibleMenuItems(role).map((item) => [item.href, item]));
  return SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    items: section.hrefs.flatMap((href) => {
      const item = visible.get(href);
      return item ? [item] : [];
    }),
  })).filter((section) => section.items.length > 0);
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type Breadcrumb = { label: string; href?: string };

const CHILD_LABELS: Record<string, string> = {
  new: 'Création',
};

/** "/vehicles/abc" → Véhicules / Détail. The dashboard has no breadcrumb trail. */
export function getBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments[0];
  if (!root) return [{ label: 'Tableau de bord' }];

  const item = MENU_ITEMS.find((entry) => entry.href === `/${root}`);
  const rootLabel = item?.label ?? (root === '403' ? 'Accès refusé' : root);
  if (segments.length === 1) return [{ label: rootLabel }];

  const child = segments[1];
  return [
    { label: rootLabel, href: `/${root}` },
    { label: CHILD_LABELS[child] ?? 'Détail' },
  ];
}
