'use client';

import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { GroupForm } from '@/features/group/components/group-form';
import { useGroup } from '@/features/group/hooks/use-group';
import { useAuth } from '@/providers/auth-provider';

export default function GroupPage() {
  const { user } = useAuth();
  const { data: group, isLoading, isError, error, refetch } = useGroup();
  const canEdit = user?.role === 'GROUP_ADMIN';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Groupe"
        description="Informations sur le groupe d’entreprises."
      />

      {isLoading ? <LoadingState rows={3} /> : null}

      {isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : null}

      {group ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {group.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Identifiant</dt>
                <dd className="mt-0.5 font-mono text-xs break-all">{group.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Créé le</dt>
                <dd className="mt-0.5">
                  {new Date(group.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
            <GroupForm group={group} canEdit={canEdit} />
            {!canEdit ? (
              <p className="text-sm text-muted-foreground">
                Seul un administrateur du groupe peut modifier ces informations.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
