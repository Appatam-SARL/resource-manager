import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  /**
   * "default": standalone block on a page.
   * "compact": inside a table or a panel.
   * "inline": one left-aligned line group, for small sections ("Tout est traité").
   */
  size?: 'default' | 'compact' | 'inline';
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  if (size === 'inline') {
    return (
      <div className={cn('flex items-start gap-3 py-3', className)}>
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? <p className="type-meta">{description}</p> : null}
          {action ? <div className="flex flex-wrap gap-2 pt-1.5">{action}</div> : null}
        </div>
      </div>
    );
  }

  const compact = size === 'compact';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-10' : 'surface px-6 py-14',
        className,
      )}
    >
      <Icon className="mb-3 size-5 text-muted-foreground" aria-hidden />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="type-meta mt-1 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
