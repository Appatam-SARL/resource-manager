'use client';

import type { Role } from '@resource-manager/types';
import { ROLE_DESCRIPTIONS } from '@/features/users/lib/user-roles';
import { ROLE_LABELS } from '@/lib/rbac';
import { cn } from 'cn';

type RoleSelectorProps = {
  value: Role;
  onChange: (role: Role) => void;
  roles: Role[];
  disabled?: boolean;
};

/** Role as radio cards, each with a short description of its scope. */
export function RoleSelector({ value, onChange, roles, disabled = false }: RoleSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Rôle" className="grid gap-2 @md:col-span-2 @md:grid-cols-2">
      {roles.map((role) => {
        const selected = role === value;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(role)}
            className={cn(
              'flex items-start gap-3 rounded-lg p-3 text-left ring-1 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60',
              selected ? 'bg-secondary/60 ring-primary/40' : 'ring-border hover:bg-muted/40',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ring-1',
                selected ? 'bg-primary ring-primary' : 'bg-background ring-input',
              )}
              aria-hidden
            >
              {selected ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{ROLE_LABELS[role]}</span>
              <span className="block text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
