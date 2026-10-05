'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { ResourceStatus } from '@resource-manager/types';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button, buttonVariants } from '@/components/ui/button';
import { RoomsFilters, RoomsTable, useRooms } from '@/features/rooms';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { canManageResources } from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';

const PAGE_SIZE = 10;

export default function RoomsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ResourceStatus | ''>('');
  const [companyId, setCompanyId] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const query = useRooms({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status,
    companyId,
  });

  const canManage = user ? canManageResources(user.role) : false;
  const hasActiveFilters = Boolean(debouncedSearch || status || companyId);
  const meta = query.data?.meta;

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setCompanyId('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salles"
        description="Salles de réunion réservables par les collaborateurs de chaque entreprise."
        meta={
          meta ? (
            <span className="tabular-nums">
              {meta.total} salle{meta.total > 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant aux filtres' : ''}
            </span>
          ) : null
        }
        actions={
          canManage ? (
            <Link href="/rooms/new" className={buttonVariants()}>
              <Plus className="size-4" aria-hidden />
              Nouvelle salle
            </Link>
          ) : null
        }
      />

      {query.isError ? (
        <ErrorState
          title="Impossible de charger les salles"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <RoomsTable
          data={query.data?.data ?? []}
          isLoading={query.isLoading}
          hasActiveFilters={hasActiveFilters}
          toolbar={
            <RoomsFilters
              search={search}
              status={status}
              companyId={companyId}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              onStatusChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              onCompanyChange={(value) => {
                setCompanyId(value);
                setPage(1);
              }}
            />
          }
          emptyAction={
            hasActiveFilters ? (
              <Button type="button" variant="outline" onClick={resetFilters}>
                Effacer les filtres
              </Button>
            ) : canManage ? (
              <Link href="/rooms/new" className={buttonVariants()}>
                <Plus className="size-4" aria-hidden />
                Ajouter une salle
              </Link>
            ) : undefined
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
