import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const STATUS_STYLES: Record<
  string,
  { label: string; variant: BadgeVariant; className?: string }
> = {
  ACTIVE: { label: 'Actif', variant: 'secondary', className: 'bg-success/15 text-success' },
  INACTIVE: { label: 'Inactif', variant: 'outline' },
  AVAILABLE: {
    label: 'Disponible',
    variant: 'secondary',
    className: 'bg-success/15 text-success',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    variant: 'secondary',
    className: 'bg-warning/15 text-warning',
  },
  OUT_OF_SERVICE: { label: 'Hors service', variant: 'destructive' },
  PENDING: {
    label: 'En attente',
    variant: 'secondary',
    className: 'bg-warning/15 text-warning',
  },
  APPROVED: {
    label: 'Approuvée',
    variant: 'secondary',
    className: 'bg-success/15 text-success',
  },
  REJECTED: { label: 'Rejetée', variant: 'destructive' },
  CANCELLED: { label: 'Annulée', variant: 'outline' },
  COMPLETED: { label: 'Terminée', variant: 'secondary' },
};

type StatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_STYLES[status] ?? {
    label: status,
    variant: 'outline' as const,
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {label ?? config.label}
    </Badge>
  );
}
