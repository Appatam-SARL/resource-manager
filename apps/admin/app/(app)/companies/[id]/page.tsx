'use client';

import { use } from 'react';
import { toast } from 'sonner';
import { Car, DoorOpen, Network, Power, PowerOff, Users } from 'lucide-react';
import { DetailErrorState } from '@/components/shared/detail-error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { CompanyDirectionsPanel } from '@/features/companies/components/company-directions-panel';
import { CompanyForm } from '@/features/companies/components/company-form';
import { useCompanyStatusToggle } from '@/features/companies/hooks/use-company-status-toggle';
import { useCompany, useUpdateCompany } from '@/features/companies/hooks/use-companies';
import { useAuth } from '@/providers/auth-provider';

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>;
};

function plural(count: number, singular: string, pluralForm: string): string {
  return count > 1 ? pluralForm : singular;
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const query = useCompany(id);
  const updateCompany = useUpdateCompany();
  const statusToggle = useCompanyStatusToggle();

  if (query.isLoading) {
    return <LoadingState label="Chargement de l’entreprise…" />;
  }

  if (query.isError || !query.data) {
    return (
      <DetailErrorState
        error={query.error}
        notFoundTitle="Entreprise introuvable"
        errorTitle="Impossible de charger l’entreprise"
        backHref="/companies"
        backLabel="Retour aux entreprises"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }

  const company = query.data;
  const counts = {
    directions: company._count?.directions ?? 0,
    users: company._count?.users ?? 0,
    vehicles: company._count?.vehicles ?? 0,
    rooms: company._count?.meetingRooms ?? 0,
  };
  const isOwnCompany = user?.companyId === company.id;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        back={{ href: '/companies', label: 'Entreprises' }}
        title={company.name}
        meta={
          <>
            <StatusBadge status={company.status} />
            {company.code ? <span className="font-mono">{company.code}</span> : null}
            {isOwnCompany ? (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-primary">Votre entreprise</span>
            ) : null}
          </>
        }
        actions={
          company.status === 'ACTIVE' ? (
            <Button type="button" variant="outline" onClick={() => statusToggle.request(company)}>
              <PowerOff className="size-4" aria-hidden />
              Désactiver
            </Button>
          ) : (
            <Button type="button" onClick={() => statusToggle.request(company)}>
              <Power className="size-4" aria-hidden />
              Réactiver
            </Button>
          )
        }
      />

      {company.status === 'INACTIVE' ? (
        <p role="status" className="rounded-xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
          Cette entreprise est désactivée : aucune nouvelle réservation ni aucun nouvel utilisateur ne peut y être créé.
          Son historique reste consultable.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Directions"
          value={counts.directions}
          icon={Network}
          hint={counts.directions === 0 ? 'Aucun niveau direction' : plural(counts.directions, 'direction', 'directions')}
        />
        <StatCard label="Utilisateurs" value={counts.users} icon={Users} hint={plural(counts.users, 'compte rattaché', 'comptes rattachés')} />
        <StatCard label="Véhicules" value={counts.vehicles} icon={Car} hint="Flotte de l’entreprise" />
        <StatCard label="Salles" value={counts.rooms} icon={DoorOpen} hint="Salles de réunion" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <CompanyForm
            key={company.updatedAt}
            mode="edit"
            company={company}
            onSubmit={async (values) => {
              try {
                await updateCompany.mutateAsync({ id: company.id, body: values });
                toast.success('Entreprise mise à jour');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Impossible de mettre à jour l’entreprise');
                throw error;
              }
            }}
          />
        </div>
        <CompanyDirectionsPanel companyId={company.id} canCreate={company.status === 'ACTIVE'} />
      </div>

      {statusToggle.dialog}
    </div>
  );
}
