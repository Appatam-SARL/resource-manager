'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  EMPTY_USER_FILTERS,
  UserFilters,
  type UserListFilters,
} from '@/features/users/components/user-filters';
import { UsersTable } from '@/features/users/components/users-table';
import { useUsers } from '@/features/users/hooks/use-users';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const PAGE_SIZE = 10;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<UserListFilters>(EMPTY_USER_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search.trim());

  const query = useUsers({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: filters.status || undefined,
    role: filters.role || undefined,
    companyId: filters.companyId || undefined,
    directionId: filters.directionId || undefined,
  });

  const hasActiveFilters = Boolean(
    debouncedSearch || filters.status || filters.role || filters.companyId || filters.directionId,
  );
  const meta = query.data?.meta;

  const updateFilters = (next: Partial<UserListFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Comptes, rôles et rattachements organisationnels."
        meta={
          meta ? (
            <span className="tabular-nums">
              {meta.total} utilisateur{meta.total > 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant aux filtres' : ''}
            </span>
          ) : null
        }
        actions={
          <Link href="/users/new" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden />
            Nouvel utilisateur
          </Link>
        }
      />

      {query.isError ? (
        <ErrorState
          title="Impossible de charger les utilisateurs"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <UsersTable
          data={query.data?.data ?? []}
          isLoading={query.isLoading}
          hasActiveFilters={hasActiveFilters}
          toolbar={<UserFilters value={filters} onChange={updateFilters} />}
          emptyAction={
            hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilters(EMPTY_USER_FILTERS);
                  setPage(1);
                }}
              >
                Effacer les filtres
              </Button>
            ) : (
              <Link href="/users/new" className={buttonVariants()}>
                <Plus className="size-4" aria-hidden />
                Ajouter un utilisateur
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
