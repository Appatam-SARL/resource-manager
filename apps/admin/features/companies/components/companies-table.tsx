'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Company } from '@resource-manager/types';
import { Building2, Car, DoorOpen, Eye, Power, PowerOff } from 'lucide-react';
import {
  DataTable,
  type DataTableAction,
  type DataTableColumn,
} from '@/components/shared/data-table';
import { EntityIcon } from '@/components/shared/entity-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { useCompanyStatusToggle } from '@/features/companies/hooks/use-company-status-toggle';
import { useAuth } from '@/providers/auth-provider';

type CompaniesTableProps = {
  data: Company[];
  isLoading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyAction?: ReactNode;
  hasActiveFilters?: boolean;
};

function CompanyIdentity({ company }: { company: Company }) {
  return (
    <Link
      href={`/companies/${company.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <EntityIcon icon={Building2} size="sm" muted={company.status === 'INACTIVE'} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground group-hover:underline">{company.name}</span>
        {company.code ? (
          <span className="block font-mono text-xs text-muted-foreground">{company.code}</span>
        ) : null}
      </span>
    </Link>
  );
}

function DirectionsCount({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-sm text-muted-foreground">Sans direction</span>;
  }
  return (
    <span className="text-sm text-foreground tabular-nums">
      {count} direction{count > 1 ? 's' : ''}
    </span>
  );
}

function ResourcesCount({ company }: { company: Company }) {
  return (
    <span className="inline-flex items-center gap-3 text-sm text-foreground tabular-nums">
      <span className="inline-flex items-center gap-1.5" title="Véhicules">
        <Car className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Véhicules :</span>
        {company._count?.vehicles ?? 0}
      </span>
      <span className="inline-flex items-center gap-1.5" title="Salles">
        <DoorOpen className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Salles :</span>
        {company._count?.meetingRooms ?? 0}
      </span>
    </span>
  );
}

export function CompaniesTable({
  data,
  isLoading,
  toolbar,
  footer,
  emptyAction,
  hasActiveFilters = false,
}: CompaniesTableProps) {
  const { user } = useAuth();
  const statusToggle = useCompanyStatusToggle();
  const canChangeStatus = user?.role === 'GROUP_ADMIN' || user?.role === 'COMPANY_ADMIN';

  const columns: DataTableColumn<Company>[] = [
    { id: 'company', header: 'Entreprise', cell: (row) => <CompanyIdentity company={row} /> },
    { id: 'directions', header: 'Directions', cell: (row) => <DirectionsCount count={row._count?.directions ?? 0} /> },
    {
      id: 'users',
      header: 'Utilisateurs',
      cell: (row) => <span className="text-sm text-foreground tabular-nums">{row._count?.users ?? 0}</span>,
    },
    { id: 'resources', header: 'Ressources', cell: (row) => <ResourcesCount company={row} /> },
    { id: 'status', header: 'Statut', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const rowActions = (row: Company): DataTableAction[] => {
    const actions: DataTableAction[] = [{ label: 'Voir la fiche', icon: Eye, href: `/companies/${row.id}` }];
    if (canChangeStatus) {
      actions.push(
        row.status === 'ACTIVE'
          ? { label: 'Désactiver', icon: PowerOff, destructive: true, separated: true, onSelect: () => statusToggle.request(row) }
          : { label: 'Réactiver', icon: Power, separated: true, onSelect: () => statusToggle.request(row) },
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
        caption="Liste des entreprises du groupe"
        emptyIcon={Building2}
        emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucune entreprise'}
        emptyDescription={
          hasActiveFilters
            ? 'Aucune entreprise ne correspond à ces critères.'
            : 'Créez une entreprise pour organiser ses utilisateurs et ses ressources.'
        }
        emptyAction={emptyAction}
        rowActions={rowActions}
        mobileCard={(row) => (
          <div className="space-y-2">
            <CompanyIdentity company={row} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-11">
              <StatusBadge status={row.status} />
              <DirectionsCount count={row._count?.directions ?? 0} />
              <span className="text-sm text-muted-foreground tabular-nums">
                {row._count?.users ?? 0} utilisateur{(row._count?.users ?? 0) > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      />
      {statusToggle.dialog}
    </>
  );
}
