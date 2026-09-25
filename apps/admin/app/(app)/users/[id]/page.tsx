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
import { UserForm } from '@/features/users/components/user-form';
import {
  useUpdateUser,
  useUpdateUserStatus,
  useUser,
} from '@/features/users/hooks/use-users';
import { ROLE_LABELS } from '@/lib/rbac';

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: user, isLoading, isError, error, refetch } = useUser(id);
  const updateUser = useUpdateUser();
  const updateStatus = useUpdateUserStatus();

  const nextStatus = user?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'
        }
        description="Détail et modification du compte."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/users" />}>
              <ArrowLeft className="size-4" />
              Retour
            </Button>
            {user ? (
              <Button
                type="button"
                variant={user.status === 'ACTIVE' ? 'outline' : 'default'}
                onClick={() => setConfirmOpen(true)}
              >
                {user.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}
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

      {user ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardHeader>
              <CardTitle>Modifier</CardTitle>
            </CardHeader>
            <CardContent>
              <UserForm
                mode="edit"
                user={user}
                onSubmit={async (values) => {
                  try {
                    await updateUser.mutateAsync({ id: user.id, body: values });
                    toast.success('Utilisateur mis à jour');
                    router.push('/users');
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
                <StatusBadge status={user.status} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Rôle</span>
                <span>{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Entreprise</span>
                <span>{user.company?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Direction</span>
                <span>{user.direction?.name ?? 'Aucune'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">E-mail</span>
                <span className="truncate">{user.email}</span>
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
            ? 'Désactiver l’utilisateur ?'
            : 'Réactiver l’utilisateur ?'
        }
        description={
          nextStatus === 'INACTIVE'
            ? 'L’utilisateur ne pourra plus se connecter.'
            : 'L’utilisateur pourra à nouveau se connecter.'
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
                  ? 'Utilisateur désactivé'
                  : 'Utilisateur réactivé',
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
