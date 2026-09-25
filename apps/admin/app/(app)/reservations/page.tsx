'use client';

import { useState } from 'react';
import type { ReservationStatus, ResourceType } from '@resource-manager/types';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { ErrorState } from '@/components/shared/error-state';
import {
  ReservationsFilters,
  ReservationsTable,
  useReservations,
} from '@/features/reservations';

export default function ReservationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReservationStatus | ''>('');
  const [resourceType, setResourceType] = useState<ResourceType | ''>('');
  const [companyId, setCompanyId] = useState('');

  const query = useReservations({
    page,
    limit: 10,
    status,
    resourceType,
    companyId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réservations"
        description="Suivez et traitez les demandes de réservation."
      />

      <ReservationsFilters
        status={status}
        resourceType={resourceType}
        companyId={companyId}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onResourceTypeChange={(value) => {
          setResourceType(value);
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
          <ReservationsTable
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
