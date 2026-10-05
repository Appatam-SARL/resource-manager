import { Car, DoorOpen } from 'lucide-react';
import type { ResourceType } from '@resource-manager/types';
import { cn } from 'cn';

export function ResourceTypeIcon({
  resourceType,
  size = 'default',
  className,
}: {
  resourceType: ResourceType;
  size?: 'sm' | 'default';
  className?: string;
}) {
  const Icon = resourceType === 'VEHICLE' ? Car : DoorOpen;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-secondary text-primary',
        size === 'sm' ? 'size-8' : 'size-9',
        className,
      )}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}
