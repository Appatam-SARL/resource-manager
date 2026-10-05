'use client';

import { use } from 'react';
import { toast } from 'sonner';
import { Building2, CalendarPlus, Mail, Network, UserCheck, UserX } from 'lucide-react';
import { DetailErrorState } from '@/components/shared/detail-error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { ResourceReservationsPanel } from '@/features/reservations';
import { UserForm } from '@/features/users/components/user-form';
import { useUserStatusToggle } from '@/features/users/hooks/use-user-status-toggle';
import { useUpdateUser, useUser } from '@/features/users/hooks/use-users';
import { canManageAccount } from '@/features/users/lib/user-roles';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = use(params);
  const { user: actor } = useAuth();
  const query = useUser(id);
  const updateUser = useUpdateUser();
  const statusToggle = useUserStatusToggle();

  if (query.isLoading) {
    return <LoadingState label="Chargement de l’utilisateur…" />;
  }

  if (query.isError || !query.data) {
    return (
      <DetailErrorState
        error={query.error}
        notFoundTitle="Utilisateur introuvable"
        errorTitle="Impossible de charger l’utilisateur"
        backHref="/users"
        backLabel="Retour aux utilisateurs"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }

  const user = query.data;
  const isSelf = actor?.id === user.id;
  const manageable = actor ? canManageAccount(actor.role, user.role) : false;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        back={{ href: '/users', label: 'Utilisateurs' }}
        title={`${user.firstName} ${user.lastName}`}
        meta={
          <>
            <StatusBadge status={user.status} />
            <span>{ROLE_LABELS[user.role]}</span>
            {isSelf ? <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-primary">Vous</span> : null}
          </>
        }
        actions={
          isSelf || !manageable ? undefined : user.status === 'ACTIVE' ? (
            <Button type="button" variant="outline" onClick={() => statusToggle.request(user)}>
              <UserX className="size-4" aria-hidden />
              Désactiver le compte
            </Button>
          ) : (
            <Button type="button" onClick={() => statusToggle.request(user)}>
              <UserCheck className="size-4" aria-hidden />
              Réactiver le compte
            </Button>
          )
        }
      />

      {user.status === 'INACTIVE' ? (
        <p role="status" className="rounded-xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
          Ce compte est désactivé : l’utilisateur ne peut plus se connecter. Son historique reste consultable.
        </p>
      ) : null}

      {manageable ? null : (
        <p role="status" className="rounded-xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
          Ce compte d’administrateur groupe ne peut être modifié que par un administrateur groupe.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <UserForm
            mode="edit"
            user={user}
            readOnly={!manageable}
            onSubmit={async (values) => {
              try {
                await updateUser.mutateAsync({ id: user.id, body: values });
                toast.success('Utilisateur mis à jour');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Impossible de mettre à jour l’utilisateur');
                throw error;
              }
            }}
          />
        </div>

        <div className="space-y-4">
          <Panel title="Profil">
            <div className="flex items-center gap-3">
              <UserAvatar firstName={user.firstName} lastName={user.lastName} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[13px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <dt className="sr-only">E-mail</dt>
                <dd className="truncate text-foreground">{user.email}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Entreprise</dt>
                <dd className="truncate text-foreground">{user.company?.name ?? '—'}</dd>
              </div>
              {user.direction ? (
                <div className="flex items-center gap-2">
                  <Network className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <dt className="sr-only">Direction</dt>
                  <dd className="truncate text-foreground">{user.direction.name}</dd>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <CalendarPlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Créé le</dt>
                <dd className="text-muted-foreground">Compte créé le {formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </Panel>
          <ResourceReservationsPanel userId={user.id} emptyDescription="Cet utilisateur n’a encore effectué aucune réservation." />
        </div>
      </div>

      {statusToggle.dialog}
    </div>
  );
}
