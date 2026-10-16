'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { EquipmentScope, ResourceStatus } from '@resource-manager/types';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button, buttonVariants } from '@/components/ui/button';
import { EquipmentsFilters, EquipmentsTable, useEquipments } from '@/features/equipments';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const PAGE_SIZE = 10;

export default function EquipmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ResourceStatus | ''>('');
  const [scope, setScope] = useState<EquipmentScope | ''>('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const query = useEquipments({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status,
    scope,
  });

  const hasActiveFilters = Boolean(debouncedSearch || status || scope);
  const meta = query.data?.meta;

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setScope('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Équipements"
        description="Catalogue commun au Groupe : équipements que les collaborateurs peuvent demander avec une réservation de salle ou de véhicule."
        meta={
          meta ? (
            <span className="tabular-nums">
              {meta.total} équipement{meta.total > 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant aux filtres' : ''}
            </span>
          ) : null
        }
        actions={
          <Link href="/equipments/new" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden />
            Nouvel équipement
          </Link>
        }
      />

      {query.isError ? (
        <ErrorState
          title="Impossible de charger les équipements"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <EquipmentsTable
          data={query.data?.data ?? []}
          isLoading={query.isLoading}
          hasActiveFilters={hasActiveFilters}
          toolbar={
            <EquipmentsFilters
              search={search}
              status={status}
              scope={scope}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              onStatusChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              onScopeChange={(value) => {
                setScope(value);
                setPage(1);
              }}
            />
          }
          emptyAction={
            hasActiveFilters ? (
              <Button type="button" variant="outline" onClick={resetFilters}>
                Effacer les filtres
              </Button>
            ) : (
              <Link href="/equipments/new" className={buttonVariants()}>
                <Plus className="size-4" aria-hidden />
                Ajouter un équipement
              </Link>
            )
          }
          footer={
            meta && meta.total > 0 ? (
              <PaginationControls
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
