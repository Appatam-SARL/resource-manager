'use client';

import type { AuditAction } from '@resource-manager/types';
import { UserRound, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AUDIT_ENTITY_LABELS } from '@/features/audit/lib/audit-display';
import { AUDIT_ACTION_LABELS } from '@/lib/format';

export type AuditListFilters = {
  entity: string;
  action: AuditAction | '';
  /** Author filter, set from a row ("Filtrer sur cet auteur") — no user list is loaded for it. */
  author: { id: string; name: string } | null;
};

export const EMPTY_AUDIT_FILTERS: AuditListFilters = { entity: '', action: '', author: null };

/** Actions actually written by the API (LOGIN / LOGOUT are not logged). */
const ACTION_OPTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'STATUS_CHANGE', 'APPROVE', 'REJECT', 'CANCEL', 'DELETE'];

type AuditFiltersProps = {
  value: AuditListFilters;
  onChange: (next: Partial<AuditListFilters>) => void;
};

export function AuditFilters({ value, onChange }: AuditFiltersProps) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={value.entity || 'ALL'}
          onValueChange={(next) => onChange({ entity: !next || next === 'ALL' ? '' : next })}
          items={{ ALL: 'Tous les éléments', ...AUDIT_ENTITY_LABELS }}
        >
          <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Type d’élément">
            <SelectValue placeholder="Tous les éléments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les éléments</SelectItem>
            {Object.entries(AUDIT_ENTITY_LABELS).map(([entity, label]) => (
              <SelectItem key={entity} value={entity}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.action || 'ALL'}
          onValueChange={(next) => onChange({ action: !next || next === 'ALL' ? '' : (next as AuditAction) })}
          items={{ ALL: 'Toutes les actions', ...AUDIT_ACTION_LABELS }}
        >
          <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Action">
            <SelectValue placeholder="Toutes les actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes les actions</SelectItem>
            {ACTION_OPTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {AUDIT_ACTION_LABELS[action]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.author ? (
        <span className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-secondary pr-1 pl-3 text-[13px] font-medium text-primary">
          <UserRound className="size-3.5" aria-hidden />
          Auteur : {value.author.name}
          <button
            type="button"
            onClick={() => onChange({ author: null })}
            className="flex size-6 items-center justify-center rounded-full hover:bg-background/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Retirer le filtre auteur"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      ) : null}
    </div>
  );
}
