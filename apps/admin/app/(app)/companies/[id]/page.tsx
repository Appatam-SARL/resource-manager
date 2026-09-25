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
import { CompanyForm } from '@/features/companies/components/company-form';
import {
  useCompany,
  useUpdateCompany,
  useUpdateCompanyStatus,
} from '@/features/companies/hooks/use-companies';

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: company, isLoading, isError, error, refetch } = useCompany(id);
  const updateCompany = useUpdateCompany();
  const updateStatus = useUpdateCompanyStatus();

  const nextStatus = company?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={company?.name ?? 'Entreprise'}
        description="Détail et modification de l’entreprise."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/companies" />}>
              <ArrowLeft className="size-4" />
              Retour
            </Button>
            {company ? (
              <Button
                type="button"
                variant={company.status === 'ACTIVE' ? 'outline' : 'default'}
                onClick={() => setConfirmOpen(true)}
              >
                {company.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}
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

      {company ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardHeader>
              <CardTitle>Modifier</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyForm
                mode="edit"
                company={company}
                onSubmit={async (values) => {
                  try {
                    await updateCompany.mutateAsync({ id: company.id, body: values });
                    toast.success('Entreprise mise à jour');
                    router.push('/companies');
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
                <StatusBadge status={company.status} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Code</span>
                <span>{company.code ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Directions</span>
                <span>{company._count?.directions ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Utilisateurs</span>
                <span>{company._count?.users ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Véhicules</span>
                <span>{company._count?.vehicles ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Salles</span>
                <span>{company._count?.meetingRooms ?? 0}</span>
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
            ? 'Désactiver l’entreprise ?'
            : 'Réactiver l’entreprise ?'
        }
        description={
          nextStatus === 'INACTIVE'
            ? 'Une entreprise inactive ne pourra plus recevoir de nouvelles réservations.'
            : 'L’entreprise pourra à nouveau être utilisée pour les réservations.'
        }
        confirmLabel={nextStatus === 'INACTIVE' ? 'Désactiver' : 'Réactiver'}
        destructive={nextStatus === 'INACTIVE'}
        loading={updateStatus.isPending}
        onConfirm={() => {
          void (async () => {
            try {
              await updateStatus.mutateAsync({
                id,
                status: nextStatus,
              });
              toast.success(
                nextStatus === 'INACTIVE'
                  ? 'Entreprise désactivée'
                  : 'Entreprise réactivée',
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
