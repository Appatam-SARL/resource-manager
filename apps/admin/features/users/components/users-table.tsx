'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { User } from '@resource-manager/types';
import { Eye, Pencil, UserCheck, UserX, Users } from 'lucide-react';
import {
  DataTable,
  type DataTableAction,
  type DataTableColumn,
} from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useUserStatusToggle } from '@/features/users/hooks/use-user-status-toggle';
import { canManageAccount } from '@/features/users/lib/user-roles';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

type UsersTableProps = {
  data: User[];
  isLoading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyAction?: ReactNode;
  hasActiveFilters?: boolean;
};

function UserIdentity({ user }: { user: User }) {
  return (
    <Link
      href={`/users/${user.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <UserAvatar firstName={user.firstName} lastName={user.lastName} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground group-hover:underline">
          {user.firstName} {user.lastName}
        </span>
        <span className="block max-w-[260px] truncate text-xs text-muted-foreground">{user.email}</span>
      </span>
    </Link>
  );
}

function RolePill({ user }: { user: User }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-xs font-medium text-foreground">
      {ROLE_LABELS[user.role]}
    </span>
  );
}

export function UsersTable({
  data,
  isLoading,
  toolbar,
  footer,
  emptyAction,
  hasActiveFilters = false,
}: UsersTableProps) {
  const { user: actor } = useAuth();
  const statusToggle = useUserStatusToggle();
  const showCompany = actor?.role === 'GROUP_ADMIN';

  const columns: DataTableColumn<User>[] = [
    { id: 'user', header: 'Utilisateur', cell: (row) => <UserIdentity user={row} /> },
    { id: 'role', header: 'Rôle', cell: (row) => <RolePill user={row} /> },
    {
      id: 'organization',
      header: showCompany ? 'Entreprise / Direction' : 'Direction',
      cell: (row) => (
        <div className="min-w-0">
          {showCompany ? <p className="truncate text-sm text-foreground">{row.company?.name ?? '—'}</p> : null}
          <p className={showCompany ? 'truncate text-xs text-muted-foreground' : 'truncate text-sm text-foreground'}>
            {row.direction?.name ?? (showCompany ? 'Sans direction' : '—')}
          </p>
        </div>
      ),
    },
    { id: 'status', header: 'Statut', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const rowActions = (row: User): DataTableAction[] => {
    const manageable = actor ? canManageAccount(actor.role, row.role) : false;
    const actions: DataTableAction[] = [
      manageable
        ? { label: 'Modifier', icon: Pencil, href: `/users/${row.id}` }
        : { label: 'Voir la fiche', icon: Eye, href: `/users/${row.id}` },
    ];
    if (manageable && row.id !== actor?.id) {
      actions.push(
        row.status === 'ACTIVE'
          ? { label: 'Désactiver le compte', icon: UserX, destructive: true, separated: true, onSelect: () => statusToggle.request(row) }
          : { label: 'Réactiver le compte', icon: UserCheck, separated: true, onSelect: () => statusToggle.request(row) },
      );
    }
    return actions;
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        toolbar={toolbar}
        footer={footer}
        caption="Liste des utilisateurs"
        emptyIcon={Users}
        emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucun utilisateur'}
        emptyDescription={
          hasActiveFilters
            ? 'Aucun utilisateur ne correspond à ces critères.'
            : 'Ajoutez un utilisateur pour lui donner accès aux ressources.'
        }
        emptyAction={emptyAction}
        rowActions={rowActions}
        mobileCard={(row) => (
          <div className="space-y-2">
            <UserIdentity user={row} />
            <div className="flex flex-wrap items-center gap-2 pl-11">
              <StatusBadge status={row.status} />
              <RolePill user={row} />
              {row.direction ? <span className="truncate text-xs text-muted-foreground">{row.direction.name}</span> : null}
            </div>
          </div>
        )}
      />
      {statusToggle.dialog}
    </>
  );
}
