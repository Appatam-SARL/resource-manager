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
import { DirectionForm } from '@/features/directions/components/direction-form';
import { useCreateDirection } from '@/features/directions/hooks/use-directions';
import { useCompanies } from '@/features/companies/hooks/use-companies';

export default function NewDirectionPage() {
  const router = useRouter();
  const { data: companiesData, isLoading, isError, error, refetch } =
    useCompanies({ page: 1, limit: 100, status: 'ACTIVE' });
  const createDirection = useCreateDirection();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle direction"
        description="Rattachez une direction à une entreprise. Certaines entreprises n’en ont pas."
        actions={
          <Button variant="outline" render={<Link href="/directions" />}>
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

      {companiesData ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <DirectionForm
              mode="create"
              companies={companiesData.data}
              onSubmit={async (values) => {
                try {
                  await createDirection.mutateAsync(values);
                  toast.success('Direction créée');
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
      ) : null}
    </div>
  );
}
