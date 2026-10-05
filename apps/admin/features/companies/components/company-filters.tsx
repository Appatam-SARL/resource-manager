'use client';

import { FilterChips, SearchInput, type FilterChipOption } from '@/components/shared/data-toolbar';

export type CompanyListFilters = {
  search: string;
  status: '' | 'ACTIVE' | 'INACTIVE';
};

export const EMPTY_COMPANY_FILTERS: CompanyListFilters = { search: '', status: '' };

const STATUS_OPTIONS: FilterChipOption<'ALL' | 'ACTIVE' | 'INACTIVE'>[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'ACTIVE', label: 'Actives' },
  { value: 'INACTIVE', label: 'Inactives' },
];

type CompanyFiltersProps = {
  value: CompanyListFilters;
  onChange: (next: Partial<CompanyListFilters>) => void;
};

export function CompanyFilters({ value, onChange }: CompanyFiltersProps) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput
        value={value.search}
        onChange={(search) => onChange({ search })}
        placeholder="Nom ou code…"
        className="lg:max-w-sm"
      />
      <FilterChips
        label="Filtrer par statut"
        options={STATUS_OPTIONS}
        value={value.status || 'ALL'}
        onChange={(status) => onChange({ status: status === 'ALL' ? '' : status })}
      />
    </div>
  );
}
