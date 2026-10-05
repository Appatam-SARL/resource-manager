'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/shared/panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers } from '@/features/users/hooks/use-users';
import { ROLE_LABELS } from '@/lib/rbac';

const PREVIEW_LIMIT = 6;

/** Users attached to a direction (server-side filter, first page only). */
export function DirectionMembersPanel({ directionId }: { directionId: string }) {
  const query = useUsers({ page: 1, limit: PREVIEW_LIMIT, directionId });
  const members = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;

  return (
    <Panel
      title="Utilisateurs rattachés"
      description={query.isSuccess ? `${total} utilisateur${total > 1 ? 's' : ''}` : undefined}
      flush
    >
      {query.isLoading ? (
        <div className="space-y-3 px-5 pb-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="px-5 pb-3 text-sm text-muted-foreground">
          <p>Impossible de charger les utilisateurs.</p>
          <Button type="button" variant="link" className="h-auto px-0" onClick={() => void query.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : members.length === 0 ? (
        <p className="mx-5 mb-3 rounded-lg bg-muted/60 px-4 py-4 text-sm text-muted-foreground">
          Aucun utilisateur n’est rattaché à cette direction pour le moment.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border border-t border-border">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/users/${member.id}`}
                  className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <UserAvatar firstName={member.firstName} lastName={member.lastName} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{ROLE_LABELS[member.role]}</span>
                  </span>
                  {member.status === 'INACTIVE' ? <StatusBadge status={member.status} /> : null}
                </Link>
              </li>
            ))}
          </ul>
          {total > members.length ? (
            <p className="border-t border-border px-5 pt-3 pb-1 text-[13px] text-muted-foreground">
              Et {total - members.length} autre{total - members.length > 1 ? 's' : ''} — filtrez la liste des utilisateurs par direction pour tout afficher.
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}
