import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Impossible de charger les données. Veuillez réessayer.',
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {action ??
        (onRetry ? (
          <Button type="button" className="mt-5" onClick={onRetry}>
            Réessayer
          </Button>
        ) : null)}
    </div>
  );
}
