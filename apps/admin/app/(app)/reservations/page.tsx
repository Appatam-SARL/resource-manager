'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  EMPTY_RESERVATION_FILTERS,
  ReservationsFilters,
  ReservationsTable,
  useReservations,
  type ReservationListFilters,
} from '@/features/reservations';

const PAGE_SIZE = 10;

export default function ReservationsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ReservationListFilters>(EMPTY_RESERVATION_FILTERS);

  const query = useReservations({ page, limit: PAGE_SIZE, ...filters });

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const updateFilters = (next: Partial<ReservationListFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };
  const resetFilters = () => {
    setFilters(EMPTY_RESERVATION_FILTERS);
    setPage(1);
  };

  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réservations"
        description="Suivez et traitez les demandes de réservation de votre périmètre."
        meta={
          meta ? (
            <span className="text-sm text-muted-foreground tabular-nums">
              {meta.total} réservation{meta.total > 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant aux filtres' : ''}
            </span>
          ) : null
        }
        actions={
          <Link href="/calendar" className={buttonVariants({ variant: 'outline' })}>
            <CalendarDays className="size-4" aria-hidden />
            Calendrier
          </Link>
        }
      />

      {query.isError ? (
        <ErrorState
          title="Impossible de charger les réservations"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <ReservationsTable
          data={query.data?.data ?? []}
          isLoading={query.isLoading}
          hasActiveFilters={hasActiveFilters}
          toolbar={<ReservationsFilters value={filters} onChange={updateFilters} onReset={resetFilters} />}
          emptyAction={
            hasActiveFilters ? (
              <Button type="button" variant="outline" onClick={resetFilters}>
                Effacer les filtres
              </Button>
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
