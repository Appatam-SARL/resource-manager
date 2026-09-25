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
import { CompanyForm } from '@/features/companies/components/company-form';
import { useCreateCompany } from '@/features/companies/hooks/use-companies';
import { useGroup } from '@/features/group/hooks/use-group';

export default function NewCompanyPage() {
  const router = useRouter();
  const { data: group, isLoading, isError, error, refetch } = useGroup();
  const createCompany = useCreateCompany();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle entreprise"
        description="Créez une entreprise rattachée au groupe."
        actions={
          <Button variant="outline" render={<Link href="/companies" />}>
            <ArrowLeft className="size-4" />
            Retour
          </Button>
        }
      />

      {isLoading ? <LoadingState rows={4} /> : null}

      {isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : null}

      {group ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyForm
              mode="create"
              groupId={group.id}
              onSubmit={async (values) => {
                try {
                  await createCompany.mutateAsync(values);
                  toast.success('Entreprise créée');
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
      ) : null}
    </div>
  );
}
