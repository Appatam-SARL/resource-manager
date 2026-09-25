import type { AuthUser, Role } from '@resource-manager/types';

export const ROLE_LABELS: Record<Role, string> = {
  GROUP_ADMIN: 'Admin Groupe',
  COMPANY_ADMIN: 'Admin Entreprise',
  MANAGER: 'Manager',
  EMPLOYEE: 'Collaborateur',
};

export type NavItem = {
  href: string;
  label: string;
  roles?: Role[];
};

export const MENU_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/group', label: 'Groupe', roles: ['GROUP_ADMIN'] },
  {
    href: '/companies',
    label: 'Entreprises',
    roles: ['GROUP_ADMIN', 'COMPANY_ADMIN'],
  },
  {
    href: '/directions',
    label: 'Directions',
    roles: ['GROUP_ADMIN', 'COMPANY_ADMIN'],
  },
  {
    href: '/users',
    label: 'Utilisateurs',
    roles: ['GROUP_ADMIN', 'COMPANY_ADMIN'],
  },
  {
    href: '/vehicles',
    label: 'Véhicules',
    roles: ['GROUP_ADMIN', 'COMPANY_ADMIN', 'MANAGER'],
  },
  {
    href: '/rooms',
    label: 'Salles',
    roles: ['GROUP_ADMIN', 'COMPANY_ADMIN', 'MANAGER'],
  },
  { href: '/reservations', label: 'Réservations' },
  { href: '/calendar', label: 'Calendrier' },
  { href: '/notifications', label: 'Notifications' },
  {
    href: '/audit',
    label: 'Audit',
    roles: ['GROUP_ADMIN', 'COMPANY_ADMIN'],
  },
];

export function canAccessRoute(role: Role, href: string): boolean {
  if (href === '/403' || href.startsWith('/403/')) return true;

  const item = MENU_ITEMS.find(
    (entry) => href === entry.href || href.startsWith(`${entry.href}/`),
  );
  if (!item) return true;
  if (!item.roles) return true;
  return item.roles.includes(role);
}

export function visibleMenuItems(role: Role): NavItem[] {
  return MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
}

export function displayName(user: AuthUser): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function organizationContext(user: AuthUser): {
  company: string;
  direction: string;
} {
  return {
    company: user.company.name,
    direction: user.direction?.name ?? 'Aucune direction',
  };
}
