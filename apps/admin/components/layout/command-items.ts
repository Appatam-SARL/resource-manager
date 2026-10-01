import type { LucideIcon } from 'lucide-react';
import { Building2, Car, DoorOpen, GitBranch, LayoutDashboard, UserPlus } from 'lucide-react';
import type { Role } from '@resource-manager/types';
import { getNavSections, NAV_ICONS } from '@/components/layout/navigation';
import { canAccessRoute } from '@/lib/rbac';
import { canManageResources } from '@/lib/reservation-permissions';

export type CommandItem = {
  id: string;
  group: 'Navigation' | 'Actions';
  label: string;
  href: string;
  icon: LucideIcon;
  keywords?: string;
};

const CREATE_ACTIONS: (CommandItem & { allowed: (role: Role) => boolean })[] = [
  {
    id: 'new-vehicle',
    group: 'Actions',
    label: 'Nouveau véhicule',
    href: '/vehicles/new',
    icon: Car,
    keywords: 'ajouter créer flotte',
    allowed: canManageResources,
  },
  {
    id: 'new-room',
    group: 'Actions',
    label: 'Nouvelle salle',
    href: '/rooms/new',
    icon: DoorOpen,
    keywords: 'ajouter créer salle de réunion',
    allowed: canManageResources,
  },
  {
    id: 'new-user',
    group: 'Actions',
    label: 'Nouvel utilisateur',
    href: '/users/new',
    icon: UserPlus,
    keywords: 'ajouter créer collaborateur compte',
    allowed: (role) => canAccessRoute(role, '/users/new'),
  },
  {
    id: 'new-direction',
    group: 'Actions',
    label: 'Nouvelle direction',
    href: '/directions/new',
    icon: GitBranch,
    keywords: 'ajouter créer',
    allowed: (role) => canAccessRoute(role, '/directions/new'),
  },
  {
    id: 'new-company',
    group: 'Actions',
    label: 'Nouvelle entreprise',
    href: '/companies/new',
    icon: Building2,
    keywords: 'ajouter créer société',
    allowed: (role) => role === 'GROUP_ADMIN',
  },
];

/** Navigation + creation shortcuts available to the role (UI only, the API still enforces permissions). */
export function getCommandItems(role: Role): CommandItem[] {
  const navigation = getNavSections(role).flatMap((section) =>
    section.items.map<CommandItem>((item) => ({
      id: `nav-${item.href}`,
      group: 'Navigation',
      label: item.label,
      href: item.href,
      icon: NAV_ICONS[item.href] ?? LayoutDashboard,
      keywords: section.label,
    })),
  );
  const actions = CREATE_ACTIONS.filter((action) => action.allowed(role)).map<CommandItem>(
    ({ id, group, label, href, icon, keywords }) => ({ id, group, label, href, icon, keywords }),
  );
  return [...navigation, ...actions];
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function filterCommandItems(items: CommandItem[], query: string): CommandItem[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((item) => {
    const haystack = normalize(`${item.label} ${item.keywords ?? ''} ${item.group}`);
    return terms.every((term) => haystack.includes(term));
  });
}
