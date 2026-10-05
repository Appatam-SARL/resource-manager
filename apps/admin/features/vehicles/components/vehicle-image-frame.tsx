import { Car } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from 'cn';

type VehicleImageFrameProps = {
  src: string | null;
  alt: string;
  loading?: boolean;
  emptyLabel?: string;
  className?: string;
};

export function VehicleImageFrame({
  src,
  alt,
  loading = false,
  emptyLabel = 'Aucune photo',
  className,
}: VehicleImageFrameProps) {
  if (loading) {
    return <Skeleton className={cn('aspect-video w-full rounded-lg', className)} />;
  }
  return (
    <div
      className={cn(
        'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-muted/60 ring-1 ring-border',
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL of an authenticated download
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <Car className="size-8" aria-hidden />
          <span className="text-xs">{emptyLabel}</span>
        </span>
      )}
    </div>
  );
}
