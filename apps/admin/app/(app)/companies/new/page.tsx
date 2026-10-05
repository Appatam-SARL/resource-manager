'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { buttonVariants } from '@/components/ui/button';
import { CompanyForm } from '@/features/companies/components/company-form';
import { useCreateCompany } from '@/features/companies/hooks/use-companies';
import { useGroup } from '@/features/group/hooks/use-group';
import { useAuth } from '@/providers/auth-provider';

export default function NewCompanyPage() {
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        back={{ href: '/companies', label: 'Entreprises' }}
        title="Nouvelle entreprise"
        description="Ajoutez une entreprise au groupe. Ses directions sont facultatives et pourront être créées ensuite."
      />
      {isGroupAdmin ? (
        <NewCompanyContent />
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="Action réservée à l’administration du groupe"
          description="Seul un administrateur groupe peut créer une entreprise."
          action={
            <Link href="/companies" className={buttonVariants({ variant: 'outline' })}>
              Retour aux entreprises
            </Link>
          }
        />
      )}
    </div>
  );
}

function NewCompanyContent() {
  const router = useRouter();
  const groupQuery = useGroup();
  const createCompany = useCreateCompany();

  if (groupQuery.isLoading) {
    return <LoadingState label="Chargement du groupe…" />;
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <ErrorState
        title="Impossible de charger le groupe"
        onRetry={() => void groupQuery.refetch()}
        retrying={groupQuery.isFetching}
      />
    );
  }

  return (
    <CompanyForm
      mode="create"
      groupId={groupQuery.data.id}
      groupName={groupQuery.data.name}
      cancelHref="/companies"
      onSubmit={async (values) => {
        try {
          const created = await createCompany.mutateAsync(values);
          toast.success('Entreprise créée');
          router.push(`/companies/${created.id}`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Impossible de créer l’entreprise');
        }
      }}
    />
  );
}
