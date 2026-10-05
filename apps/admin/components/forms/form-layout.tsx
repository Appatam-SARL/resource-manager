import type { ReactNode } from 'react';
import { cn } from 'cn';

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Titled group of fields: description on the left when the form card is wide enough, fields on the right.
 * Breakpoints are container-based so the layout also fits narrow columns (detail pages with a side panel).
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section
      className={cn(
        'grid gap-4 border-b border-border py-6 first:pt-0 last:border-0 last:pb-0 @3xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)] @3xl:gap-10',
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="type-section-title">{title}</h2>
        {description ? <p className="type-meta">{description}</p> : null}
      </div>
      <div className="grid min-w-0 gap-4 @md:grid-cols-2">{children}</div>
    </section>
  );
}

/** Card wrapping a sectioned form. */
export function FormCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('@container surface p-5 md:p-6', className)}>
      {children}
    </div>
  );
}

/** Right-aligned form actions, optionally sticky at the bottom of long pages. */
export function FormActions({
  children,
  sticky = false,
  className,
}: {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end',
        sticky && 'sticky bottom-0 z-10 -mx-5 mt-6 bg-card/95 px-5 pb-4 backdrop-blur md:-mx-6 md:px-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
