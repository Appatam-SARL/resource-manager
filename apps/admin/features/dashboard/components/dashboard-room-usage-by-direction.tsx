import { DoorOpen } from 'lucide-react';
import type { RoomUsageStats } from '@resource-manager/types';
import { Panel } from '@/components/shared/panel';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatAverageDuration,
  formatUsageDirectionLabel,
  usageSharePercent,
} from '../lib/dashboard';

export function DashboardRoomUsageByDirection({
  roomUsage,
  loading,
  showCompany,
}: {
  roomUsage: RoomUsageStats | undefined;
  loading: boolean;
  /** Group-wide view: direction names may repeat across companies. */
  showCompany: boolean;
}) {
  const directions = roomUsage?.topDirections;
  const totalMinutes = roomUsage?.totalMinutes ?? 0;
  const periodDays = roomUsage?.periodDays ?? 30;

  return (
    <Panel
      title="Directions les plus consommatrices de salles"
      description={`Temps de réunion réservé · ${periodDays} derniers jours`}
    >
      {loading ? (
        <div className="space-y-4 py-1">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : !directions ? (
        <p className="text-sm text-muted-foreground">Donnée indisponible.</p>
      ) : directions.length === 0 ? (
        <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
          <DoorOpen className="size-5 shrink-0" aria-hidden />
          Aucune réunion terminée dans votre périmètre sur cette période.
        </div>
      ) : (
        <ol className="space-y-3.5">
          {directions.map((entry, index) => {
            const label = formatUsageDirectionLabel(entry, showCompany);
            const share = usageSharePercent(entry.totalMinutes, totalMinutes);
            return (
              <li key={entry.directionId ?? `company-${entry.companyId}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-2 text-sm">
                    <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                    <span className="truncate font-medium text-foreground" title={label}>
                      {label}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">{formatAverageDuration(entry.totalMinutes)}</span>
                    {' · '}
                    {share} %
                  </span>
                </div>
                <div
                  className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={`Part du temps de réunion de ${label}`}
                  aria-valuenow={share}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${share}%` }}
                  />
                </div>
                <p className="mt-1 ml-6 text-xs text-muted-foreground">
                  {entry.reservationCount} réunion{entry.reservationCount > 1 ? 's' : ''}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
