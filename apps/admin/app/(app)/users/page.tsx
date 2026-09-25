'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { useCompanies } from '@/features/companies/hooks/use-companies';
import { UserFilters } from '@/features/users/components/user-filters';
import { UsersTable } from '@/features/users/components/users-table';
import { useUsers } from '@/features/users/hooks/use-users';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [companyId, setCompanyId] = useState('all');

  const { data: companiesData } = useCompanies({ page: 1, limit: 100 });

  const params = {
    page,
    limit,
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    role: role === 'all' ? undefined : role,
    companyId: companyId === 'all' ? undefined : companyId,
  };

  const { data, isLoading, isError, error, refetch } = useUsers(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes et leurs rattachements organisationnels."
        actions={
          <Button render={<Link href="/users/new" />}>
            <Plus className="size-4" />
            Nouvel utilisateur
          </Button>
        }
      />

      <UserFilters
        search={search}
        status={status}
        role={role}
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
        onRoleChange={(value) => {
          setRole(value);
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
          <UsersTable data={data?.data ?? []} isLoading={isLoading} />
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
