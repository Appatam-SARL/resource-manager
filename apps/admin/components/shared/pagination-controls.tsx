'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1 && total === undefined) {
    return null;
  }

  const safeTotalPages = Math.max(totalPages, 1);
  const canPrev = page > 1;
  const canNext = page < safeTotalPages;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Page {page} sur {safeTotalPages}
        {typeof total === 'number' ? ` · ${total} résultat${total > 1 ? 's' : ''}` : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Précédent
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
