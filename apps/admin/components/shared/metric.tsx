import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from 'cn';

/**
 * Row of key figures in a single band separated by rules — not one card per number.
 * Stacks on mobile, side by side from `sm`.
 */
export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid divide-y divide-border border-y border-border sm:auto-cols-fr sm:grid-flow-col sm:divide-x sm:divide-y-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

type MetricProps = {
  label: string;
  value: ReactNode;
  /** One line explaining the figure ("Tout est traité", "3 véhicules · 2 salles"). */
  hint?: ReactNode;
  /**
   * "attention": something waits for the user — warning accent and a call to action.
   * "quiet": nothing to do — the figure recedes.
   */
  tone?: 'default' | 'attention' | 'quiet';
  action?: { href: string; label: string };
  loading?: boolean;
  className?: string;
};

export function Metric({ label, value, hint, tone = 'default', action, loading = false, className }: MetricProps) {
  const attention = tone === 'attention';
  return (
    <div className={cn('relative min-w-0 py-4 sm:px-5 sm:first:pl-0 sm:last:pr-0', className)}>
      <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
        {attention ? <span className="size-1.5 rounded-full bg-warning" aria-hidden /> : null}
        {label}
      </p>
      {loading ? (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ) : (
        <>
          <p className={cn('type-metric mt-1', tone === 'quiet' && 'text-muted-foreground')}>{value}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {hint ? <p className="type-meta">{hint}</p> : null}
            {action ? (
              <Link
                href={action.href}
                className={cn(
                  'group inline-flex items-center gap-1 rounded-sm text-[13px] font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  attention ? 'text-warning hover:underline' : 'text-foreground hover:underline',
                )}
              >
                {action.label}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
