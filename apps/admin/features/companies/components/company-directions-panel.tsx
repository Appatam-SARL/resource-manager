'use client';

import Link from 'next/link';
import { ChevronRight, Network, Plus, Users } from 'lucide-react';
import { EntityIcon } from '@/components/shared/entity-icon';
import { Panel } from '@/components/shared/panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDirections } from '@/features/directions/hooks/use-directions';

const PREVIEW_LIMIT = 8;

type CompanyDirectionsPanelProps = {
  companyId: string;
  canCreate: boolean;
};

/** Directions of a company — an empty list is a normal situation, not an error. */
export function CompanyDirectionsPanel({ companyId, canCreate }: CompanyDirectionsPanelProps) {
  const query = useDirections({ page: 1, limit: PREVIEW_LIMIT, companyId });
  const directions = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const createHref = `/directions/new?companyId=${companyId}`;

  return (
    <Panel
      title="Directions"
      description="Niveau d’organisation optionnel."
      flush
      action={
        canCreate && directions.length > 0 ? (
          <Link href={createHref} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <Plus className="size-4" aria-hidden />
            Ajouter
          </Link>
        ) : undefined
      }
    >
      {query.isLoading ? (
        <div className="space-y-3 px-5 pb-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="px-5 pb-3 text-sm text-muted-foreground">
          <p>Impossible de charger les directions.</p>
          <Button type="button" variant="link" className="h-auto px-0" onClick={() => void query.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : directions.length === 0 ? (
        <div className="mx-5 mb-3 rounded-lg bg-muted/60 px-4 py-4 text-sm">
          <p className="font-medium text-foreground">Aucune direction</p>
          <p className="mt-1 text-muted-foreground">
            Les utilisateurs de cette entreprise y sont rattachés directement, sans niveau direction.
          </p>
          {canCreate ? (
            <Link href={createHref} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-3' })}>
              <Plus className="size-4" aria-hidden />
              Créer une direction
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border border-t border-border">
            {directions.map((direction) => (
              <li key={direction.id}>
                <Link
                  href={`/directions/${direction.id}`}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <EntityIcon icon={Network} size="sm" muted={direction.status === 'INACTIVE'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{direction.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                      <Users className="size-3" aria-hidden />
                      {direction._count?.users ?? 0} utilisateur{(direction._count?.users ?? 0) > 1 ? 's' : ''}
                    </span>
                  </span>
                  {direction.status === 'INACTIVE' ? <StatusBadge status={direction.status} /> : null}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {total > directions.length ? (
            <div className="border-t border-border px-5 pt-3 pb-1">
              <Link href={`/directions?companyId=${companyId}`} className="text-sm font-medium text-primary hover:underline">
                Voir les {total} directions
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
