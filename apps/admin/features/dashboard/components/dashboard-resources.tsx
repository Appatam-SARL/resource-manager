import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Car, DoorOpen } from 'lucide-react';
import type { DashboardSummary } from '@resource-manager/types';
import { Panel } from '@/components/shared/panel';
import { Skeleton } from '@/components/ui/skeleton';

function AvailabilityRow({
  icon: Icon,
  label,
  available,
  total,
  href,
}: {
  icon: LucideIcon;
  label: string;
  available: number;
  total: number;
  href?: string;
}) {
  const ratio = total === 0 ? 0 : Math.round((available / total) * 100);
  const unavailable = total - available;
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {label}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">{available}</span> / {total} disponibles
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`${label} disponibles`}
        aria-valuenow={ratio}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${ratio}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {total === 0
          ? 'Aucune ressource enregistrée'
          : unavailable > 0
            ? `${unavailable} en maintenance ou hors service`
            : 'Toutes les ressources sont opérationnelles'}
      </p>
    </>
  );

  if (!href) return <div className="rounded-lg p-3">{body}</div>;
  return (
    <Link
      href={href}
      className="block rounded-lg p-3 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {body}
    </Link>
  );
}

export function DashboardResources({
  summary,
  canOpenResources,
}: {
  summary: DashboardSummary | undefined;
  canOpenResources: boolean;
}) {
  return (
    <Panel title="Ressources" description="État opérationnel de la flotte et des salles" flush>
      {summary ? (
        <div className="space-y-1 px-2">
          <AvailabilityRow
            icon={Car}
            label="Véhicules"
            available={summary.resources.vehicles.available}
            total={summary.resources.vehicles.total}
            href={canOpenResources ? '/vehicles' : undefined}
          />
          <AvailabilityRow
            icon={DoorOpen}
            label="Salles"
            available={summary.resources.rooms.available}
            total={summary.resources.rooms.total}
            href={canOpenResources ? '/rooms' : undefined}
          />
        </div>
      ) : (
        <div className="space-y-5 px-5 py-2">
          {[0, 1].map((index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
