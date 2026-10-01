'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { UserForm } from '@/features/users/components/user-form';
import { useCreateUser } from '@/features/users/hooks/use-users';

export default function NewUserPage() {
  const router = useRouter();
  const createUser = useCreateUser();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        back={{ href: '/users', label: 'Utilisateurs' }}
        title="Nouvel utilisateur"
        description="Créez un compte rattaché à une entreprise, avec ou sans direction."
      />
      <UserForm
        mode="create"
        cancelHref="/users"
        onSubmit={async (values) => {
          try {
            const created = await createUser.mutateAsync(values);
            toast.success('Utilisateur créé');
            router.push(`/users/${created.id}`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Impossible de créer l’utilisateur');
          }
        }}
      />
    </div>
  );
}
