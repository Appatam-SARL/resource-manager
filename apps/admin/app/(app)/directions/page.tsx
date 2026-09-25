'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { DirectionFilters } from '@/features/directions/components/direction-filters';
import { DirectionsTable } from '@/features/directions/components/directions-table';
import { useDirections } from '@/features/directions/hooks/use-directions';
import { useCompanies } from '@/features/companies/hooks/use-companies';

export default function DirectionsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [companyId, setCompanyId] = useState('all');

  const { data: companiesData } = useCompanies({ page: 1, limit: 100 });

  const params = {
    page,
    limit,
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    companyId: companyId === 'all' ? undefined : companyId,
  };

  const { data, isLoading, isError, error, refetch } = useDirections(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directions"
        description="Les directions sont optionnelles selon l’entreprise."
        actions={
          <Button render={<Link href="/directions/new" />}>
            <Plus className="size-4" />
            Nouvelle direction
          </Button>
        }
      />

      <DirectionFilters
        search={search}
        status={status}
        companyId={companyId}
        companies={companiesData?.data ?? []}
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

      {isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <DirectionsTable data={data?.data ?? []} isLoading={isLoading} />
          {data ? (
            <PaginationControls
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
