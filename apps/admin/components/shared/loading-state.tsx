import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

type LoadingStateProps = {
  className?: string;
  /** Announced to screen readers only. */
  label?: string;
  rows?: number;
};

/** Generic list skeleton; prefer a skeleton shaped like the final content when possible. */
export function LoadingState({ className, label = 'Chargement…', rows = 4 }: LoadingStateProps) {
  return (
    <div
      className={cn('surface space-y-3 p-4', className)}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-[22px] w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Full-screen placeholder used while the session is resolved. */
export function AppLoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-11 animate-pulse items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          RM
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
