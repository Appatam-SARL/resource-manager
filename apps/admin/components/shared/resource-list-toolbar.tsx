'use client';

import type { ResourceStatus } from '@resource-manager/types';
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

const STATUS_OPTIONS: FilterChipOption<ResourceStatus | 'ALL'>[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'AVAILABLE', label: 'Disponibles' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OUT_OF_SERVICE', label: 'Hors service' },
];

type ResourceListToolbarProps = {
  search: string;
  status: ResourceStatus | '';
  companyId: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ResourceStatus | '') => void;
  onCompanyChange: (value: string) => void;
};

/** Search (server side), status chips and — for the Group admin only — a company filter. */
export function ResourceListToolbar({
  search,
  status,
  companyId,
  searchPlaceholder,
  onSearchChange,
  onStatusChange,
  onCompanyChange,
}: ResourceListToolbarProps) {
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const companiesQuery = useCompaniesOptions(isGroupAdmin);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} className="lg:max-w-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          label="Filtrer par statut"
          options={STATUS_OPTIONS}
          value={status || 'ALL'}
          onChange={(next) => onStatusChange(next === 'ALL' ? '' : next)}
        />
        {isGroupAdmin ? (
          <Select
            value={companyId || 'ALL'}
            onValueChange={(next) => onCompanyChange(!next || next === 'ALL' ? '' : next)}
            items={selectItems(companiesQuery.data ?? [], { ALL: 'Toutes les entreprises' })}
          >
            <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Entreprise">
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
