'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { DirectionForm } from '@/features/directions/components/direction-form';
import {
  useDirection,
  useUpdateDirection,
  useUpdateDirectionStatus,
} from '@/features/directions/hooks/use-directions';

type DirectionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function DirectionDetailPage({
  params,
}: DirectionDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: direction, isLoading, isError, error, refetch } =
    useDirection(id);
  const updateDirection = useUpdateDirection();
  const updateStatus = useUpdateDirectionStatus();

  const nextStatus = direction?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={direction?.name ?? 'Direction'}
        description="Détail et modification de la direction."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/directions" />}>
              <ArrowLeft className="size-4" />
              Retour
            </Button>
            {direction ? (
              <Button
                type="button"
                variant={direction.status === 'ACTIVE' ? 'outline' : 'default'}
                onClick={() => setConfirmOpen(true)}
              >
                {direction.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}
              </Button>
            ) : null}
          </div>
        }
      />

      {isLoading ? <LoadingState rows={5} /> : null}

      {isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : null}

      {direction ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardHeader>
              <CardTitle>Modifier</CardTitle>
            </CardHeader>
            <CardContent>
              <DirectionForm
                mode="edit"
                direction={direction}
                onSubmit={async (values) => {
                  try {
                    await updateDirection.mutateAsync({
                      id: direction.id,
                      body: values,
                    });
                    toast.success('Direction mise à jour');
                    router.push('/directions');
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : 'Erreur inattendue',
                    );
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Synthèse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Statut</span>
                <StatusBadge status={direction.status} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Entreprise</span>
                <span>{direction.company?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Code</span>
                <span>{direction.code ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Utilisateurs</span>
                <span>{direction._count?.users ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          nextStatus === 'INACTIVE'
            ? 'Désactiver la direction ?'
            : 'Réactiver la direction ?'
        }
        description={
          nextStatus === 'INACTIVE'
            ? 'La direction ne sera plus proposée pour les nouveaux rattachements.'
            : 'La direction pourra à nouveau être utilisée.'
        }
        confirmLabel={nextStatus === 'INACTIVE' ? 'Désactiver' : 'Réactiver'}
        destructive={nextStatus === 'INACTIVE'}
        loading={updateStatus.isPending}
        onConfirm={() => {
          void (async () => {
            try {
              await updateStatus.mutateAsync({ id, status: nextStatus });
              toast.success(
                nextStatus === 'INACTIVE'
                  ? 'Direction désactivée'
                  : 'Direction réactivée',
              );
              setConfirmOpen(false);
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : 'Erreur inattendue',
              );
            }
          })();
        }}
      />
    </div>
  );
}
