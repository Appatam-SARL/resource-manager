'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { ResourceStatus } from '@resource-manager/types';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { ErrorState } from '@/components/shared/error-state';
import { buttonVariants } from '@/components/ui/button';
import { RoomsFilters, RoomsTable, useRooms } from '@/features/rooms';
import { canManageResources } from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';
import { cn } from 'cn';

export default function RoomsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ResourceStatus | ''>('');
  const [companyId, setCompanyId] = useState('');

  const query = useRooms({
    page,
    limit: 10,
    search: search.trim() || undefined,
    status,
    companyId,
  });

  const canManage = user ? canManageResources(user.role) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salles"
        description="Gérez les salles de réunion des entreprises."
        actions={
          canManage ? (
            <Link
              href="/rooms/new"
              className={cn(buttonVariants(), 'gap-1.5')}
            >
              <Plus className="size-4" />
              Nouvelle salle
            </Link>
          ) : null
        }
      />

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

      {query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <>
          <RoomsTable
            data={query.data?.data ?? []}
            isLoading={query.isLoading}
          />
          {query.data ? (
            <PaginationControls
              page={query.data.meta.page}
              totalPages={query.data.meta.totalPages}
              total={query.data.meta.total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
