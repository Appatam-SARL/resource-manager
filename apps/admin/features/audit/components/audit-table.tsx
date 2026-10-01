'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { AuditLog } from '@resource-manager/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExternalLink, FileSearch, ScrollText, UserRound } from 'lucide-react';
import {
  DataTable,
  type DataTableAction,
  type DataTableColumn,
} from '@/components/shared/data-table';
import { UserAvatar } from '@/components/shared/user-avatar';
import { AuditActionBadge } from '@/features/audit/components/audit-action-badge';
import {
  auditEntityHref,
  auditEntityLabel,
  summarizeAuditLog,
} from '@/features/audit/lib/audit-display';

type AuditTableProps = {
  data: AuditLog[];
  isLoading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyAction?: ReactNode;
  hasActiveFilters?: boolean;
  onOpenDetail: (log: AuditLog) => void;
  onFilterByAuthor: (author: { id: string; name: string }) => void;
};

function authorName(log: AuditLog): string | null {
  return log.user ? `${log.user.firstName} ${log.user.lastName}` : null;
}

function AuditDate({ value }: { value: string }) {
  const date = new Date(value);
  return (
    <time dateTime={value} className="block whitespace-nowrap">
      <span className="block text-sm text-foreground">{format(date, 'd MMM yyyy', { locale: fr })}</span>
      <span className="block text-xs text-muted-foreground tabular-nums">{format(date, 'HH:mm:ss')}</span>
    </time>
  );
}

function AuditAuthor({ log }: { log: AuditLog }) {
  if (!log.user) {
    return <span className="text-sm text-muted-foreground">Système</span>;
  }
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <UserAvatar firstName={log.user.firstName} lastName={log.user.lastName} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{authorName(log)}</span>
        {log.user.email ? (
          <span className="hidden max-w-[200px] truncate text-xs text-muted-foreground xl:block">{log.user.email}</span>
        ) : null}
      </span>
    </span>
  );
}

function AuditElement({ log }: { log: AuditLog }) {
  const href = auditEntityHref(log);
  const label = auditEntityLabel(log.entity);
  if (!href) return <span className="pl-1 text-xs text-muted-foreground">{label}</span>;
  return (
    <Link
      href={href}
      className="pl-1 text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {label}
    </Link>
  );
}

function AuditSummary({ log }: { log: AuditLog }) {
  const summary = summarizeAuditLog(log);
  return (
    <span className="line-clamp-2 max-w-sm text-sm text-muted-foreground">{summary ?? '—'}</span>
  );
}

export function AuditTable({
  data,
  isLoading,
  toolbar,
  footer,
  emptyAction,
  hasActiveFilters = false,
  onOpenDetail,
  onFilterByAuthor,
}: AuditTableProps) {
  const columns: DataTableColumn<AuditLog>[] = [
    { id: 'createdAt', header: 'Date', cell: (row) => <AuditDate value={row.createdAt} /> },
    { id: 'author', header: 'Auteur', cell: (row) => <AuditAuthor log={row} /> },
    {
      id: 'operation',
      header: 'Opération',
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <AuditActionBadge action={row.action} />
          <AuditElement log={row} />
        </div>
      ),
    },
    { id: 'summary', header: 'Résumé', className: 'whitespace-normal', cell: (row) => <AuditSummary log={row} /> },
  ];

  const rowActions = (row: AuditLog): DataTableAction[] => {
    const actions: DataTableAction[] = [
      { label: 'Voir le détail', icon: FileSearch, onSelect: () => onOpenDetail(row) },
    ];
    const href = auditEntityHref(row);
    if (href) actions.push({ label: 'Ouvrir l’élément', icon: ExternalLink, href });
    const name = authorName(row);
    if (row.user && name) {
      const author = { id: row.user.id, name };
      actions.push({
        label: 'Filtrer sur cet auteur',
        icon: UserRound,
        separated: true,
        onSelect: () => onFilterByAuthor(author),
      });
    }
    return actions;
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      toolbar={toolbar}
      footer={footer}
      caption="Journal d’audit"
      emptyIcon={ScrollText}
      emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucune opération enregistrée'}
      emptyDescription={
        hasActiveFilters
          ? 'Aucune opération ne correspond à ces filtres.'
          : 'Les opérations sensibles apparaîtront ici dès qu’elles seront effectuées.'
      }
      emptyAction={emptyAction}
      rowActions={rowActions}
      mobileCard={(row) => (
        <button
          type="button"
          onClick={() => onOpenDetail(row)}
          className="block w-full space-y-2 rounded-md text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex flex-wrap items-center gap-2">
            <AuditActionBadge action={row.action} />
            <span className="text-sm font-medium text-foreground">{auditEntityLabel(row.entity)}</span>
          </span>
          <AuditSummary log={row} />
          <span className="block text-xs text-muted-foreground">
            {authorName(row) ?? 'Système'} · {format(new Date(row.createdAt), 'd MMM yyyy, HH:mm', { locale: fr })}
          </span>
        </button>
      )}
    />
  );
}
