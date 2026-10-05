import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from 'cn';

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  href?: string;
  /** Emphasised tone for values that need attention (e.g. pending requests). */
  tone?: 'default' | 'attention';
  loading?: boolean;
};

/** Compact figure for detail pages; the icon is a label hint, not a decoration. */
export function StatCard({ label, value, hint, icon: Icon, href, tone = 'default', loading = false }: StatCardProps) {
  const attention = tone === 'attention';
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
        <Icon className={cn('size-3.5', attention ? 'text-warning' : 'text-muted-foreground/80')} aria-hidden />
        {label}
      </p>
      {loading ? (
        <div className="mt-2.5 space-y-2">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-28" />
        </div>
      ) : (
        <>
          <p className={cn('type-metric mt-1.5', attention && 'text-warning')}>{value}</p>
          {hint ? <p className="type-meta mt-0.5">{hint}</p> : null}
        </>
      )}
      {href ? (
        <ArrowRight
          className="absolute top-4 right-4 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      ) : null}
    </>
  );

  const className = 'group relative block surface px-4 py-3.5';

  if (href && !loading) {
    return (
      <Link
        href={href}
        className={cn(
          className,
          'transition-colors hover:border-input hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
