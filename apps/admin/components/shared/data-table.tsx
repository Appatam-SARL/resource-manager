'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from 'cn';

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyTitle = 'Aucun élément',
  emptyDescription = 'Aucune donnée à afficher pour le moment.',
  emptyAction,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState className={className} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-card ring-1 ring-border/60',
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn('bg-muted/40 px-4', column.headerClassName)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((column) => (
                <TableCell key={column.id} className={cn('px-4 py-3', column.className)}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
