'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { AuditLog } from '@resource-manager/types';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AuditActionBadge } from '@/features/audit/components/audit-action-badge';
import {
  auditChanges,
  auditDetailEntries,
  auditEntityHref,
  auditEntityLabel,
} from '@/features/audit/lib/audit-display';
import { formatDateTime } from '@/lib/format';

type AuditDetailSheetProps = {
  log: AuditLog | null;
  onOpenChange: (open: boolean) => void;
};

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

export function AuditDetailSheet({ log, onOpenChange }: AuditDetailSheetProps) {
  const changes = log ? auditChanges(log.metadata) : [];
  const entries = log ? auditDetailEntries(log.metadata) : [];
  const href = log ? auditEntityHref(log) : null;

  return (
    <Sheet open={log !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {log ? (
          <>
            <SheetHeader className="border-b border-border pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <AuditActionBadge action={log.action} />
                <SheetTitle>{auditEntityLabel(log.entity)}</SheetTitle>
              </div>
              <SheetDescription>{formatDateTime(log.createdAt)}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4">
              <DetailSection title="Auteur">
                {log.user ? (
                  <div className="flex items-center gap-3">
                    <UserAvatar firstName={log.user.firstName} lastName={log.user.lastName} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {log.user.firstName} {log.user.lastName}
                      </p>
                      {log.user.email ? (
                        <p className="truncate text-xs text-muted-foreground">{log.user.email}</p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Opération effectuée par le système.</p>
                )}
              </DetailSection>

              {changes.length > 0 ? (
                <DetailSection title="Modifications">
                  <ul className="divide-y divide-border rounded-lg ring-1 ring-border">
                    {changes.map((change) => (
                      <li key={change.key} className="space-y-1 px-3 py-2.5">
                        <p className="text-xs font-medium text-muted-foreground">{change.label}</p>
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                            {change.before}
                          </span>
                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-label="devient" />
                          <span className="font-medium text-foreground">{change.after}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              ) : null}

              {entries.length > 0 ? (
                <DetailSection title="Informations">
                  <dl className="divide-y divide-border">
                    {entries.map((entry) => (
                      <DetailRow key={entry.key} label={entry.label}>
                        {entry.value}
                      </DetailRow>
                    ))}
                  </dl>
                </DetailSection>
              ) : null}

              {changes.length === 0 && entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune information complémentaire pour cette opération.</p>
              ) : null}

              {log.entityId ? (
                <DetailSection title="Référence">
                  <p className="font-mono text-xs break-all text-muted-foreground">{log.entityId}</p>
                </DetailSection>
              ) : null}
            </div>

            {href ? (
              <SheetFooter className="border-t border-border">
                <Link href={href} className={buttonVariants({ variant: 'outline', className: 'gap-2' })}>
                  <ExternalLink className="size-4" aria-hidden />
                  Ouvrir l’élément
                </Link>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
