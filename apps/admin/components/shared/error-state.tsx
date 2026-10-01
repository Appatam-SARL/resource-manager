import { AlertTriangle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  action?: ReactNode;
  /** Technical details, only rendered in development. */
  details?: string;
  size?: 'default' | 'compact';
  className?: string;
};

export function ErrorState({
  title = 'Impossible de charger les données',
  message = 'Réessayez dans quelques instants. Si le problème persiste, vérifiez votre connexion.',
  onRetry,
  retrying = false,
  action,
  details,
  size = 'default',
  className,
}: ErrorStateProps) {
  const compact = size === 'compact';
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-10' : 'surface px-6 py-14',
        className,
      )}
    >
      <AlertTriangle className="mb-3 size-5 text-destructive" aria-hidden />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="type-meta mt-1 max-w-sm">{message}</p>
      {details && process.env.NODE_ENV === 'development' ? (
        <pre className="mt-3 max-w-lg overflow-x-auto rounded-md bg-muted px-3 py-2 text-left font-mono text-xs text-muted-foreground">
          {details}
        </pre>
      ) : null}
      {action ??
        (onRetry ? (
          <Button type="button" variant="outline" className="mt-4" onClick={onRetry} disabled={retrying}>
            <RotateCw className={cn('size-4', retrying && 'animate-spin')} aria-hidden />
            Réessayer
          </Button>
        ) : null)}
    </div>
  );
}
