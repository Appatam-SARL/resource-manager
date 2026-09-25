'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { CompaniesTable } from '@/features/companies/components/companies-table';
import { CompanyFilters } from '@/features/companies/components/company-filters';
import { useCompanies } from '@/features/companies/hooks/use-companies';

export default function CompaniesPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const params = {
    page,
    limit,
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
  };

  const { data, isLoading, isError, error, refetch } = useCompanies(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entreprises"
        description="Gérez les entreprises du groupe."
        actions={
          <Button render={<Link href="/companies/new" />}>
            <Plus className="size-4" />
            Nouvelle entreprise
          </Button>
        }
      />

      <CompanyFilters
        search={search}
        status={status}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
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
          <CompaniesTable data={data?.data ?? []} isLoading={isLoading} />
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
