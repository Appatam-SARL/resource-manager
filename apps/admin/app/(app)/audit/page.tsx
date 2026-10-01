'use client';

import { useState } from 'react';
import type { AuditLog } from '@resource-manager/types';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { useAuditLogs } from '@/features/audit';
import { AuditDetailSheet } from '@/features/audit/components/audit-detail-sheet';
import {
  AuditFilters,
  EMPTY_AUDIT_FILTERS,
  type AuditListFilters,
} from '@/features/audit/components/audit-filters';
import { AuditTable } from '@/features/audit/components/audit-table';
import { useAuth } from '@/providers/auth-provider';

const PAGE_SIZE = 20;

export default function AuditPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditListFilters>(EMPTY_AUDIT_FILTERS);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const query = useAuditLogs({
    page,
    limit: PAGE_SIZE,
    action: filters.action,
    entity: filters.entity || undefined,
    userId: filters.author?.id,
  });

  const hasActiveFilters = Boolean(filters.entity || filters.action || filters.author);
  const meta = query.data?.meta;

  const updateFilters = (next: Partial<AuditListFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit"
        description={
          user?.role === 'GROUP_ADMIN'
            ? 'Journal des opérations sensibles du groupe (lecture seule).'
            : 'Opérations sensibles effectuées par les utilisateurs de votre entreprise (lecture seule).'
        }
        meta={
          meta ? (
            <span className="tabular-nums">
              {meta.total} opération{meta.total > 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant aux filtres' : ''}
            </span>
          ) : null
        }
      />

      {query.isError ? (
        <ErrorState
          title="Impossible de charger le journal d’audit"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <AuditTable
          data={query.data?.data ?? []}
          isLoading={query.isLoading}
          hasActiveFilters={hasActiveFilters}
          toolbar={<AuditFilters value={filters} onChange={updateFilters} />}
          onOpenDetail={setSelectedLog}
          onFilterByAuthor={(author) => updateFilters({ author })}
          emptyAction={
            hasActiveFilters ? (
              <Button type="button" variant="outline" onClick={() => updateFilters(EMPTY_AUDIT_FILTERS)}>
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

      <AuditDetailSheet
        log={selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      />
    </div>
  );
}
