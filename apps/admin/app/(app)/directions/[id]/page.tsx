'use client';

import { use } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Building2, ChevronRight, Network, Power, PowerOff } from 'lucide-react';
import { DetailErrorState } from '@/components/shared/detail-error-state';
import { EntityIcon } from '@/components/shared/entity-icon';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { DirectionForm } from '@/features/directions/components/direction-form';
import { DirectionMembersPanel } from '@/features/directions/components/direction-members-panel';
import { useDirectionStatusToggle } from '@/features/directions/hooks/use-direction-status-toggle';
import { useDirection, useUpdateDirection } from '@/features/directions/hooks/use-directions';

type DirectionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function DirectionDetailPage({ params }: DirectionDetailPageProps) {
  const { id } = use(params);
  const query = useDirection(id);
  const updateDirection = useUpdateDirection();
  const statusToggle = useDirectionStatusToggle();

  if (query.isLoading) {
    return <LoadingState label="Chargement de la direction…" />;
  }

  if (query.isError || !query.data) {
    return (
      <DetailErrorState
        error={query.error}
        notFoundTitle="Direction introuvable"
        errorTitle="Impossible de charger la direction"
        backHref="/directions"
        backLabel="Retour aux directions"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }

  const direction = query.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        back={{ href: '/directions', label: 'Directions' }}
        title={direction.name}
        meta={
          <>
            <StatusBadge status={direction.status} />
            {direction.code ? <span className="font-mono">{direction.code}</span> : null}
            {direction.company ? <span>{direction.company.name}</span> : null}
          </>
        }
        actions={
          direction.status === 'ACTIVE' ? (
            <Button type="button" variant="outline" onClick={() => statusToggle.request(direction)}>
              <PowerOff className="size-4" aria-hidden />
              Désactiver
            </Button>
          ) : (
            <Button type="button" onClick={() => statusToggle.request(direction)}>
              <Power className="size-4" aria-hidden />
              Réactiver
            </Button>
          )
        }
      />

      {direction.status === 'INACTIVE' ? (
        <p role="status" className="rounded-xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
          Cette direction est désactivée : elle n’est plus proposée lors du rattachement des utilisateurs.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <DirectionForm
            mode="edit"
            direction={direction}
            onSubmit={async (values) => {
              try {
                await updateDirection.mutateAsync({ id: direction.id, body: values });
                toast.success('Direction mise à jour');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Impossible de mettre à jour la direction');
                throw error;
              }
            }}
          />
        </div>

        <div className="space-y-4">
          <Panel title="Place dans l’organisation">
            <ol className="space-y-1" aria-label="Rattachement organisationnel">
              <li>
                <Link
                  href={`/companies/${direction.companyId}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                >
                  <EntityIcon icon={Building2} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">Entreprise</span>
                    <span className="block truncate text-sm font-medium text-foreground">{direction.company?.name ?? '—'}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
              <li className="ml-6 flex items-center gap-3 border-l border-border py-2 pl-4" aria-current="true">
                <EntityIcon icon={Network} size="sm" muted={direction.status === 'INACTIVE'} />
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">Direction</span>
                  <span className="block truncate text-sm font-medium text-foreground">{direction.name}</span>
                </span>
              </li>
            </ol>
          </Panel>
          <DirectionMembersPanel directionId={direction.id} />
        </div>
      </div>

      {statusToggle.dialog}
    </div>
  );
}
