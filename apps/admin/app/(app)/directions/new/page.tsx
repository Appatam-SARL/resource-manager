'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { DirectionForm } from '@/features/directions/components/direction-form';
import { useCreateDirection } from '@/features/directions/hooks/use-directions';

type NewDirectionPageProps = {
  searchParams: Promise<{ companyId?: string | string[] }>;
};

export default function NewDirectionPage({ searchParams }: NewDirectionPageProps) {
  const { companyId } = use(searchParams);
  const initialCompanyId = typeof companyId === 'string' ? companyId : undefined;
  const router = useRouter();
  const createDirection = useCreateDirection();
  const backHref = initialCompanyId ? `/companies/${initialCompanyId}` : '/directions';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        back={initialCompanyId ? { href: backHref, label: 'Entreprise' } : { href: '/directions', label: 'Directions' }}
        title="Nouvelle direction"
        description="Les directions sont facultatives : n’en créez que si l’entreprise est organisée ainsi."
      />
      <DirectionForm
        mode="create"
        initialCompanyId={initialCompanyId}
        cancelHref={backHref}
        onSubmit={async (values) => {
          try {
            const created = await createDirection.mutateAsync(values);
            toast.success('Direction créée');
            router.push(`/directions/${created.id}`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Impossible de créer la direction');
          }
        }}
      />
    </div>
  );
}
