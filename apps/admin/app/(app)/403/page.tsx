import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { buttonVariants } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        className="w-full max-w-md"
        icon={ShieldOff}
        title="Accès refusé"
        description="Vous n’avez pas les permissions nécessaires pour consulter cette page. Contactez un administrateur si vous pensez qu’il s’agit d’une erreur."
        action={
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Retour au tableau de bord
          </Link>
        }
      />
    </div>
  );
}
