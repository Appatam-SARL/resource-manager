'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Equipment } from '@resource-manager/types';
import { Package } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { EQUIPMENT_SCOPE_LABELS } from '@/features/equipments/lib/equipment-display';

type EquipmentsTableProps = {
  data: Equipment[];
  isLoading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyAction?: ReactNode;
  hasActiveFilters?: boolean;
};

function EquipmentIdentity({ equipment }: { equipment: Equipment }) {
  return (
    <Link
      href={`/equipments/${equipment.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Package className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground group-hover:underline">{equipment.name}</span>
        {equipment.description ? (
          <span className="block truncate text-xs text-muted-foreground">{equipment.description}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function EquipmentsTable({
  data,
  isLoading,
  toolbar,
  footer,
  emptyAction,
  hasActiveFilters = false,
}: EquipmentsTableProps) {
  const columns: DataTableColumn<Equipment>[] = [
    { id: 'equipment', header: 'Équipement', cell: (row) => <EquipmentIdentity equipment={row} /> },
    { id: 'scope', header: 'Périmètre', cell: (row) => EQUIPMENT_SCOPE_LABELS[row.scope] },
    {
      id: 'quantity',
      header: 'Quantité',
      cell: (row) => <span className="text-sm text-foreground tabular-nums">{row.quantity}</span>,
    },
    { id: 'status', header: 'Statut', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      toolbar={toolbar}
      footer={footer}
      caption="Catalogue des équipements"
      emptyIcon={Package}
      emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucun équipement'}
      emptyDescription={
        hasActiveFilters
          ? 'Aucun équipement ne correspond à votre recherche.'
          : 'Ajoutez un premier équipement (vidéoprojecteur, micro…) pour qu’il puisse être demandé avec une réservation.'
      }
      emptyAction={emptyAction}
      mobileCard={(row) => (
        <div className="space-y-2">
          <EquipmentIdentity equipment={row} />
          <div className="flex items-center gap-3 pl-11 text-xs text-muted-foreground">
            <StatusBadge status={row.status} />
            <span>{EQUIPMENT_SCOPE_LABELS[row.scope]}</span>
            <span className="tabular-nums">{row.quantity} unité(s)</span>
          </div>
        </div>
      )}
    />
  );
}
