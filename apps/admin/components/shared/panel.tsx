import type { ReactNode } from 'react';
import { cn } from 'cn';

type PanelProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes the content padding, for edge-to-edge lists. */
  flush?: boolean;
  /**
   * "surface": white container, for blocks that must stand out (lists, forms beside a panel).
   * "plain": no container — a titled section separated by a rule, for secondary information.
   */
  variant?: 'surface' | 'plain';
};

/** Titled section used for dashboard blocks and detail pages. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  flush = false,
  variant = 'surface',
}: PanelProps) {
  const plain = variant === 'plain';
  return (
    <section className={cn('flex min-w-0 flex-col', !plain && 'surface', className)}>
      <header
        className={cn(
          'flex items-start justify-between gap-3',
          plain ? 'border-b border-border pb-2.5' : 'px-4 pt-3.5 pb-3 md:px-5',
        )}
      >
        <div className="min-w-0">
          <h2 className="type-section-title">{title}</h2>
          {description ? <p className="type-meta mt-0.5">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-1">{action}</div> : null}
      </header>
      <div className={cn('flex-1', plain ? 'pt-3' : flush ? 'pb-1.5' : 'px-4 pb-4 md:px-5')}>{children}</div>
    </section>
  );
}