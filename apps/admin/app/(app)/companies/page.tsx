'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button, buttonVariants } from '@/components/ui/button';
import { CompaniesTable } from '@/features/companies/components/companies-table';
import {
  CompanyFilters,
  EMPTY_COMPANY_FILTERS,
  type CompanyListFilters,
} from '@/features/companies/components/company-filters';
import { useCompanies } from '@/features/companies/hooks/use-companies';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/providers/auth-provider';

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'GROUP_ADMIN';
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CompanyListFilters>(EMPTY_COMPANY_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search.trim());

  const query = useCompanies({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: filters.status || undefined,
  });

  const hasActiveFilters = Boolean(debouncedSearch || filters.status);
  const meta = query.data?.meta;

  const updateFilters = (next: Partial<CompanyListFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const createLink = (label: string) => (
    <Link href="/companies/new" className={buttonVariants()}>
      <Plus className="size-4" aria-hidden />
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entreprises"
        description={
          canCreate
            ? 'Entreprises du groupe, leurs directions, utilisateurs et ressources.'
            : 'Votre entreprise, ses directions, utilisateurs et ressources.'
        }
        meta={
          meta ? (
            <span className="tabular-nums">
              {meta.total} entreprise{meta.total > 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant aux filtres' : ''}
            </span>
          ) : null
        }
        actions={canCreate ? createLink('Nouvelle entreprise') : undefined}
      />

      {query.isError ? (
        <ErrorState
          title="Impossible de charger les entreprises"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <CompaniesTable
          data={query.data?.data ?? []}
          isLoading={query.isLoading}
          hasActiveFilters={hasActiveFilters}
          toolbar={<CompanyFilters value={filters} onChange={updateFilters} />}
          emptyAction={
            hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilters(EMPTY_COMPANY_FILTERS);
                  setPage(1);
                }}
              >
                Effacer les filtres
              </Button>
            ) : canCreate ? (
              createLink('Ajouter une entreprise')
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
