'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  total?: number;
  /** Page size, used to display the "1–10 sur 124" range. */
  limit?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1 && total === undefined) {
    return null;
  }

  const safeTotalPages = Math.max(totalPages, 1);
  const canPrev = page > 1;
  const canNext = page < safeTotalPages;

  let summary = `Page ${page} sur ${safeTotalPages}`;
  if (typeof total === 'number' && limit) {
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);
    summary = `${from}–${to} sur ${total}`;
  } else if (typeof total === 'number') {
    summary += ` · ${total} résultat${total > 1 ? 's' : ''}`;
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-3', className)}
    >
      <p className="text-[13px] text-muted-foreground tabular-nums">{summary}</p>
      <div className="flex items-center gap-1">
        <span className="mr-2 hidden text-[13px] text-muted-foreground tabular-nums sm:inline">
          {page} / {safeTotalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
