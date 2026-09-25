'use client';

import { useState } from 'react';
import type { AuditAction, AuditLog } from '@resource-manager/types';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { ErrorState } from '@/components/shared/error-state';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuditLogs } from '@/features/audit';
import { AUDIT_ACTION_LABELS, formatDateTime, userDisplayName } from '@/lib/format';

function formatDetails(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '—';
  try {
    return JSON.stringify(metadata);
  } catch {
    return '—';
  }
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | ''>('');
  const [entity, setEntity] = useState('');
  const [userId, setUserId] = useState('');

  const query = useAuditLogs({
    page,
    limit: 20,
    action,
    entity: entity.trim() || undefined,
    userId: userId.trim() || undefined,
  });

  const columns: DataTableColumn<AuditLog>[] = [
    {
      id: 'createdAt',
      header: 'Date',
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      id: 'user',
      header: 'Utilisateur',
      cell: (row) => userDisplayName(row.user),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row) =>
        AUDIT_ACTION_LABELS[row.action as AuditAction] ?? row.action,
    },
    {
      id: 'entity',
      header: 'Entité',
      cell: (row) => row.entity,
    },
    {
      id: 'entityId',
      header: 'ID',
      cell: (row) => (
        <span className="font-mono text-xs">{row.entityId ?? '—'}</span>
      ),
    },
    {
      id: 'details',
      header: 'Détails',
      cell: (row) => (
        <span className="line-clamp-2 max-w-xs text-xs text-muted-foreground">
          {formatDetails(row.metadata)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit"
        description="Journal des opérations sensibles (lecture seule)."
      />

      <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-border/60 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Action</Label>
          <Select
            value={action || 'ALL'}
            onValueChange={(value) => {
              setAction(
                !value || value === 'ALL' ? '' : (value as AuditAction),
              );
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Toutes les actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les actions</SelectItem>
              {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {AUDIT_ACTION_LABELS[key]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-entity">Entité</Label>
          <Input
            id="audit-entity"
            placeholder="Reservation, Vehicle…"
            value={entity}
            onChange={(event) => {
              setEntity(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-user">ID utilisateur</Label>
          <Input
            id="audit-user"
            placeholder="Identifiant utilisateur (optionnel)"
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={query.data?.data ?? []}
            getRowId={(row) => row.id}
            isLoading={query.isLoading}
            emptyTitle="Aucun journal"
            emptyDescription="Aucune entrée d’audit pour ces filtres."
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
