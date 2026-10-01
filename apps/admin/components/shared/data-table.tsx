'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
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

export type DataTableAction = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Renders a separator before this action. */
  separated?: boolean;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  /** Secondary actions, grouped in a "…" menu at the end of each row. */
  rowActions?: (row: T) => DataTableAction[];
  /** Card layout rendered instead of the table below the md breakpoint. */
  mobileCard?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  skeletonRows?: number;
  caption?: string;
  className?: string;
};

export function RowActionsMenu({ actions, label }: { actions: DataTableAction[]; label: string }) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground data-popup-open:bg-muted"
            aria-label={label}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              {Icon ? <Icon className="size-4" aria-hidden /> : null}
              {action.label}
            </>
          );
          return (
            <div key={action.label}>
              {action.separated ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                variant={action.destructive ? 'destructive' : 'default'}
                disabled={action.disabled}
                onClick={action.onSelect}
                render={action.href ? <Link href={action.href} /> : undefined}
              >
                {content}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="hidden md:block">
        <div className="flex gap-6 border-b border-border px-5 py-3">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-6 border-b border-border/70 px-5 py-4 last:border-0">
            {Array.from({ length: columns }).map((__, col) => (
              <Skeleton
                key={col}
                className={cn('h-3.5 flex-1', col === 0 && 'max-w-48', col === columns - 1 && 'max-w-20')}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="px-4 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, index) => (
          <div key={index} className="space-y-2 border-b border-border/70 py-3 last:border-0">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyTitle = 'Aucun élément',
  emptyDescription = 'Aucune donnée à afficher pour le moment.',
  emptyIcon,
  emptyAction,
  rowActions,
  mobileCard,
  toolbar,
  footer,
  skeletonRows = 6,
  caption,
  className,
}: DataTableProps<T>) {
  const hasActions = Boolean(rowActions);
  const columnCount = columns.length + (hasActions ? 1 : 0);

  let body: ReactNode;
  if (isLoading) {
    body = <TableSkeleton columns={columnCount} rows={skeletonRows} />;
  } else if (data.length === 0) {
    body = (
      <EmptyState
        size="compact"
        className="py-14"
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  } else {
    body = (
      <>
        <div className={cn(mobileCard && 'hidden md:block')}>
          <Table>
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      'h-9 px-4 text-xs font-medium text-muted-foreground first:pl-5',
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </TableHead>
                ))}
                {hasActions ? (
                  <TableHead className="h-9 w-12 px-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  className="border-border/70 transition-colors duration-100 hover:bg-muted/50"
                >
                  {columns.map((column) => (
                    <TableCell key={column.id} className={cn('px-4 py-3 first:pl-5', column.className)}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                  {rowActions ? (
                    <TableCell className="px-3 py-3 text-right">
                      <RowActionsMenu actions={rowActions(row)} label="Actions" />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {mobileCard ? (
          <ul className="divide-y divide-border md:hidden">
            {data.map((row) => (
              <li key={getRowId(row)} className="flex items-start gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">{mobileCard(row)}</div>
                {rowActions ? <RowActionsMenu actions={rowActions(row)} label="Actions" /> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  }

  return (
    <div className={cn('surface overflow-hidden', className)}>
      {toolbar ? <div className="border-b border-border px-3 py-2.5 md:px-4">{toolbar}</div> : null}
      {body}
      {footer ? <div className="border-t border-border px-4 py-2.5 md:px-5">{footer}</div> : null}
    </div>
  );
}
