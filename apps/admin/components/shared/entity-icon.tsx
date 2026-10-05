import type { LucideIcon } from 'lucide-react';
import { cn } from 'cn';

/** Icon tile identifying an organisational entity (company, direction…) in lists and headers. */
export function EntityIcon({
  icon: Icon,
  size = 'default',
  muted = false,
  className,
}: {
  icon: LucideIcon;
  size?: 'sm' | 'default';
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        muted ? 'bg-muted text-muted-foreground' : 'bg-secondary text-primary',
        size === 'sm' ? 'size-8' : 'size-9',
        className,
      )}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}
