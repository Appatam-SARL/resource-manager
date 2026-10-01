'use client';

import type { ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from 'cn';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  label = 'Rechercher',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 bg-background pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label="Effacer la recherche"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/** Search on the left, filters / secondary actions on the right; stacks vertically on mobile. */
export function DataToolbar({
  search,
  children,
  className,
}: {
  search?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      {search ?? <span />}
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export type FilterChipOption<V extends string> = { value: V; label: string; count?: number };

/** Quick, mutually exclusive filters (e.g. Toutes / En attente / Approuvées). */
export function FilterChips<V extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: FilterChipOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('scrollbar-none flex max-w-full gap-0.5 overflow-x-auto rounded-md bg-muted p-0.5', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
              selected
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'rounded px-1 text-[11px] tabular-nums',
                  selected ? 'bg-secondary text-primary' : 'bg-background/70',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** "Filtres" button showing how many advanced filters are active. */
export function FiltersButton({ activeCount, onClick }: { activeCount: number; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="h-9 gap-2" onClick={onClick}>
      <SlidersHorizontal className="size-4" aria-hidden />
      Filtres
      {activeCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
}

/** Advanced filters grouped in a side sheet instead of a long row of selects. */
export function FilterSheet({
  open,
  onOpenChange,
  onReset,
  children,
  description = 'Affinez la liste selon votre périmètre.',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  children: ReactNode;
  description?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Filtres</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-4">{children}</div>
        <SheetFooter className="flex-row justify-between border-t border-border">
          <Button type="button" variant="ghost" onClick={onReset}>
            Réinitialiser
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Afficher les résultats
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
