'use client';

import { FilterChips, SearchInput, type FilterChipOption } from '@/components/shared/data-toolbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { selectItems } from '@/lib/select-items';
import { useCompaniesOptions } from '@/hooks/use-companies-options';
import { useAuth } from '@/providers/auth-provider';

export type DirectionListFilters = {
  search: string;
  status: '' | 'ACTIVE' | 'INACTIVE';
  companyId: string;
};

export const EMPTY_DIRECTION_FILTERS: DirectionListFilters = { search: '', status: '', companyId: '' };

const STATUS_OPTIONS: FilterChipOption<'ALL' | 'ACTIVE' | 'INACTIVE'>[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'ACTIVE', label: 'Actives' },
  { value: 'INACTIVE', label: 'Inactives' },
];

type DirectionFiltersProps = {
  value: DirectionListFilters;
  onChange: (next: Partial<DirectionListFilters>) => void;
};

export function DirectionFilters({ value, onChange }: DirectionFiltersProps) {
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const companiesQuery = useCompaniesOptions(isGroupAdmin);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput
        value={value.search}
        onChange={(search) => onChange({ search })}
        placeholder="Nom ou code…"
        className="lg:max-w-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          label="Filtrer par statut"
          options={STATUS_OPTIONS}
          value={value.status || 'ALL'}
          onChange={(status) => onChange({ status: status === 'ALL' ? '' : status })}
        />
        {isGroupAdmin ? (
          <Select
            value={value.companyId || 'ALL'}
            onValueChange={(next) => onChange({ companyId: !next || next === 'ALL' ? '' : next })}
            items={selectItems(companiesQuery.data ?? [], { ALL: 'Toutes les entreprises' })}
          >
            <SelectTrigger className="h-9 w-full sm:w-56" aria-label="Entreprise">
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
        ) : null}
      </div>
    </div>
  );
}
