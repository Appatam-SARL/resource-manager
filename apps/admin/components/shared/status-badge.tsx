import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';
import { getStatusConfig, STATUS_TONE_CLASSES, type StatusTone } from '@/lib/status';

type ToneBadgeProps = {
  tone: StatusTone;
  children: ReactNode;
  /** Replaces the tone dot. */
  icon?: LucideIcon;
  className?: string;
};

/** Base badge for any toned label (statuses, audit actions…); colours come from `STATUS_TONE_CLASSES` only. */
export function ToneBadge({ tone, children, icon: Icon, className }: ToneBadgeProps) {
  const classes = STATUS_TONE_CLASSES[tone];
  return (
    <span
      data-slot="status-badge"
      className={cn(
        'inline-flex h-[22px] w-fit shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        classes.badge,
        className,
      )}
    >
      {Icon ? (
        <Icon className="size-3.5" aria-hidden />
      ) : (
        <span className={cn('size-1.5 rounded-full', classes.dot)} aria-hidden />
      )}
      {children}
    </span>
  );
}

type StatusBadgeProps = {
  status: string;
  label?: string;
  /** "dot" is the compact default used in tables; "icon" is more explicit for detail pages. */
  variant?: 'dot' | 'icon';
  className?: string;
};

export function StatusBadge({ status, label, variant = 'dot', className }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  return (
    <ToneBadge tone={config.tone} icon={variant === 'icon' ? config.icon : undefined} className={className}>
      {label ?? config.label}
    </ToneBadge>
  );
}
