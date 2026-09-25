import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

type LoadingStateProps = {
  className?: string;
  label?: string;
  rows?: number;
};

export function LoadingState({
  className,
  label = 'Chargement…',
  rows = 4,
}: LoadingStateProps) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">{label}</p>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-xl" />
      ))}
    </div>
  );
}
