'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DirectionFilters,
  EMPTY_DIRECTION_FILTERS,
  type DirectionListFilters,
} from '@/features/directions/components/direction-filters';
import { DirectionsTable } from '@/features/directions/components/directions-table';
import { useDirections } from '@/features/directions/hooks/use-directions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/providers/auth-provider';

const PAGE_SIZE = 10;

type DirectionsPageProps = {
  searchParams: Promise<{ companyId?: string | string[] }>;
};

export default function DirectionsPage({ searchParams }: DirectionsPageProps) {
  const { companyId: initialCompanyId } = use(searchParams);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DirectionListFilters>(() => ({
    ...EMPTY_DIRECTION_FILTERS,
    companyId: typeof initialCompanyId === 'string' ? initialCompanyId : '',
  }));
  const debouncedSearch = useDebouncedValue(filters.search.trim());
  const { user } = useAuth();
  // Other roles are scoped to their own company by the API; the company filter only exists for the Group admin.
  const companyId = user?.role === 'GROUP_ADMIN' ? filters.companyId : '';

  const query = useDirections({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: filters.status || undefined,
    companyId: companyId || undefined,
  });

  const hasActiveFilters = Boolean(debouncedSearch || filters.status || companyId);
  const meta = query.data?.meta;

  const updateFilters = (next: Partial<DirectionListFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const createHref = companyId ? `/directions/new?companyId=${companyId}` : '/directions/new';
  const createLink = (label: string) => (
    <Link href={createHref} className={buttonVariants()}>
      <Plus className="size-4" aria-hidden />
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directions"
        description="Niveau d’organisation facultatif : certaines entreprises fonctionnent sans direction."
        meta={
          meta ? (
            <span className="tabular-nums">
              {meta.total} direction{meta.total > 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant aux filtres' : ''}
            </span>
          ) : null
        }
        actions={createLink('Nouvelle direction')}
      />

      {query.isError ? (
        <ErrorState
          title="Impossible de charger les directions"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <DirectionsTable
          data={query.data?.data ?? []}
          isLoading={query.isLoading}
          hasActiveFilters={hasActiveFilters}
          toolbar={<DirectionFilters value={filters} onChange={updateFilters} />}
          emptyAction={
            hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilters(EMPTY_DIRECTION_FILTERS);
                  setPage(1);
                }}
              >
                Effacer les filtres
              </Button>
            ) : (
              createLink('Créer une direction')
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
