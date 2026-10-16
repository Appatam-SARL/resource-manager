'use client';

import type { EquipmentScope, ResourceStatus } from '@resource-manager/types';
import { FilterChips, SearchInput, type FilterChipOption } from '@/components/shared/data-toolbar';

const STATUS_OPTIONS: FilterChipOption<ResourceStatus | 'ALL'>[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'AVAILABLE', label: 'Disponibles' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OUT_OF_SERVICE', label: 'Hors service' },
];

const SCOPE_OPTIONS: FilterChipOption<EquipmentScope | 'ALL'>[] = [
  { value: 'ALL', label: 'Tous périmètres' },
  { value: 'ROOM', label: 'Salles' },
  { value: 'VEHICLE', label: 'Véhicules' },
  { value: 'BOTH', label: 'Les deux' },
];

type EquipmentsFiltersProps = {
  search: string;
  status: ResourceStatus | '';
  scope: EquipmentScope | '';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ResourceStatus | '') => void;
  onScopeChange: (value: EquipmentScope | '') => void;
};

export function EquipmentsFilters({
  search,
  status,
  scope,
  onSearchChange,
  onStatusChange,
  onScopeChange,
}: EquipmentsFiltersProps) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput value={search} onChange={onSearchChange} placeholder="Nom ou description…" className="lg:max-w-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          label="Filtrer par périmètre"
          options={SCOPE_OPTIONS}
          value={scope || 'ALL'}
          onChange={(next) => onScopeChange(next === 'ALL' ? '' : next)}
        />
        <FilterChips
          label="Filtrer par statut"
          options={STATUS_OPTIONS}
          value={status || 'ALL'}
          onChange={(next) => onStatusChange(next === 'ALL' ? '' : next)}
        />
      </div>
    </div>
  );
}
