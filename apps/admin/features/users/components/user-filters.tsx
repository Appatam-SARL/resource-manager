'use client';

import { useState } from 'react';
import type { Role } from '@resource-manager/types';
import {
  FilterChips,
  FilterSheet,
  FiltersButton,
  SearchInput,
  type FilterChipOption,
} from '@/components/shared/data-toolbar';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { selectItems } from '@/lib/select-items';
import { useDirections } from '@/features/directions/hooks/use-directions';
import { ROLE_ORDER } from '@/features/users/lib/user-roles';
import { useCompaniesOptions } from '@/hooks/use-companies-options';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

export type UserListFilters = {
  search: string;
  status: '' | 'ACTIVE' | 'INACTIVE';
  role: Role | '';
  companyId: string;
  directionId: string;
};

export const EMPTY_USER_FILTERS: UserListFilters = {
  search: '',
  status: '',
  role: '',
  companyId: '',
  directionId: '',
};

const STATUS_OPTIONS: FilterChipOption<'ALL' | 'ACTIVE' | 'INACTIVE'>[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'ACTIVE', label: 'Actifs' },
  { value: 'INACTIVE', label: 'Inactifs' },
];

type UserFiltersProps = {
  value: UserListFilters;
  onChange: (next: Partial<UserListFilters>) => void;
};

export function UserFilters({ value, onChange }: UserFiltersProps) {
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const directionsCompanyId = isGroupAdmin ? value.companyId : (user?.companyId ?? '');

  const companiesQuery = useCompaniesOptions(isGroupAdmin && sheetOpen);
  const directionsQuery = useDirections(
    { page: 1, limit: 100, status: 'ACTIVE', companyId: directionsCompanyId },
    { enabled: sheetOpen && Boolean(directionsCompanyId) },
  );
  const directions = directionsQuery.data?.data ?? [];
  const advancedCount = (value.companyId ? 1 : 0) + (value.directionId ? 1 : 0);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput
        value={value.search}
        onChange={(search) => onChange({ search })}
        placeholder="Nom, prénom ou e-mail…"
        className="lg:max-w-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          label="Filtrer par statut"
          options={STATUS_OPTIONS}
          value={value.status || 'ALL'}
          onChange={(status) => onChange({ status: status === 'ALL' ? '' : status })}
        />
        <Select
          value={value.role || 'ALL'}
          onValueChange={(next) => onChange({ role: !next || next === 'ALL' ? '' : (next as Role) })}
          items={{ ALL: 'Tous les rôles', ...ROLE_LABELS }}
        >
          <SelectTrigger className="h-9 w-full sm:w-48" aria-label="Rôle">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les rôles</SelectItem>
            {ROLE_ORDER.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FiltersButton activeCount={advancedCount} onClick={() => setSheetOpen(true)} />
      </div>

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onReset={() => onChange({ companyId: '', directionId: '' })}
        description="Affinez la liste selon l’organisation."
      >
        {isGroupAdmin ? (
          <div className="space-y-1.5">
            <Label htmlFor="users-filter-company">Entreprise</Label>
            <Select
              value={value.companyId || 'ALL'}
              onValueChange={(next) => onChange({ companyId: !next || next === 'ALL' ? '' : next, directionId: '' })}
              items={selectItems(companiesQuery.data ?? [], { ALL: 'Toutes les entreprises' })}
            >
              <SelectTrigger id="users-filter-company" className="w-full">
                <SelectValue placeholder="Toutes les entreprises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les entreprises</SelectItem>
                {(companiesQuery.data ?? []).map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="users-filter-direction">Direction</Label>
          {!directionsCompanyId ? (
            <p className="text-sm text-muted-foreground">Choisissez une entreprise pour filtrer par direction.</p>
          ) : directionsQuery.isSuccess && directions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cette entreprise ne possède pas de direction.</p>
          ) : (
            <Select
              value={value.directionId || 'ALL'}
              onValueChange={(next) => onChange({ directionId: !next || next === 'ALL' ? '' : next })}
              items={selectItems(directions, { ALL: 'Toutes les directions' })}
            >
              <SelectTrigger id="users-filter-direction" className="w-full" disabled={directionsQuery.isLoading}>
                <SelectValue placeholder="Toutes les directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les directions</SelectItem>
                {directions.map((direction) => (
                  <SelectItem key={direction.id} value={direction.id}>
                    {direction.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </FilterSheet>
    </div>
  );
}
