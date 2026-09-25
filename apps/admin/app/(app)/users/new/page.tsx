'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { useCompanies } from '@/features/companies/hooks/use-companies';
import { UserForm } from '@/features/users/components/user-form';
import { useCreateUser } from '@/features/users/hooks/use-users';

export default function NewUserPage() {
  const router = useRouter();
  const { data: companiesData, isLoading, isError, error, refetch } =
    useCompanies({ page: 1, limit: 100, status: 'ACTIVE' });
  const createUser = useCreateUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvel utilisateur"
        description="Créez un compte rattaché à une entreprise, avec ou sans direction."
        actions={
          <Button variant="outline" render={<Link href="/users" />}>
            <ArrowLeft className="size-4" />
            Retour
          </Button>
        }
      />

      {isLoading ? <LoadingState rows={5} /> : null}

      {isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : null}

      {companiesData ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm
              mode="create"
              companies={companiesData.data}
              onSubmit={async (values) => {
                try {
                  await createUser.mutateAsync(values);
                  toast.success('Utilisateur créé');
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
      ) : null}
    </div>
  );
}
