'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { ReservationStatus, ResourceType } from '@resource-manager/types';
import {
  FilterChips,
  FilterSheet,
  FiltersButton,
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
import { useCompaniesOptions } from '@/hooks/use-companies-options';
import { useAuth } from '@/providers/auth-provider';

export type ReservationListFilters = {
  status: ReservationStatus | '';
  resourceType: ResourceType | '';
  companyId: string;
  directionId: string;
};

export const EMPTY_RESERVATION_FILTERS: ReservationListFilters = {
  status: '',
  resourceType: '',
  companyId: '',
  directionId: '',
};

const STATUS_OPTIONS: FilterChipOption<ReservationStatus | 'ALL'>[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvées' },
  { value: 'COMPLETED', label: 'Terminées' },
  { value: 'REJECTED', label: 'Refusées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

const TYPE_OPTIONS: FilterChipOption<ResourceType | 'ALL'>[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'VEHICLE', label: 'Véhicules' },
  { value: 'ROOM', label: 'Salles' },
];

type ReservationsFiltersProps = {
  value: ReservationListFilters;
  onChange: (next: Partial<ReservationListFilters>) => void;
  onReset: () => void;
};

export function ReservationsFilters({ value, onChange, onReset }: ReservationsFiltersProps) {
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const hasAdvancedFilters = isGroupAdmin || user?.role === 'COMPANY_ADMIN';
  const directionsCompanyId = isGroupAdmin ? value.companyId : (user?.companyId ?? '');

  const companiesQuery = useCompaniesOptions(isGroupAdmin && sheetOpen);
  const directionsQuery = useDirections(
    { page: 1, limit: 100, status: 'ACTIVE', companyId: directionsCompanyId },
    { enabled: hasAdvancedFilters && sheetOpen && Boolean(directionsCompanyId) },
  );
  const directions = directionsQuery.data?.data ?? [];

  const advancedCount = (value.companyId ? 1 : 0) + (value.directionId ? 1 : 0);
  const hasAnyFilter = Boolean(value.status || value.resourceType || advancedCount > 0);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <FilterChips
        label="Filtrer par statut"
        options={STATUS_OPTIONS}
        value={value.status || 'ALL'}
        onChange={(status) => onChange({ status: status === 'ALL' ? '' : status })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          label="Filtrer par type de ressource"
          options={TYPE_OPTIONS}
          value={value.resourceType || 'ALL'}
          onChange={(resourceType) => onChange({ resourceType: resourceType === 'ALL' ? '' : resourceType })}
        />
        {hasAdvancedFilters ? (
          <FiltersButton activeCount={advancedCount} onClick={() => setSheetOpen(true)} />
        ) : null}
        {hasAnyFilter ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X className="size-3.5" aria-hidden />
            Effacer
          </button>
        ) : null}
      </div>

      {hasAdvancedFilters ? (
        <FilterSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onReset={() => onChange({ companyId: '', directionId: '' })}
          description="Affinez la liste selon l’organisation."
        >
          {isGroupAdmin ? (
            <div className="space-y-1.5">
              <Label htmlFor="filter-company">Entreprise</Label>
              <Select
                value={value.companyId || 'ALL'}
                onValueChange={(next) =>
                  onChange({ companyId: !next || next === 'ALL' ? '' : next, directionId: '' })
                }
                items={selectItems(companiesQuery.data ?? [], { ALL: 'Toutes les entreprises' })}
              >
                <SelectTrigger id="filter-company" className="w-full">
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
            <Label htmlFor="filter-direction">Direction</Label>
            {!directionsCompanyId ? (
              <p className="text-sm text-muted-foreground">
                Choisissez une entreprise pour filtrer par direction.
              </p>
            ) : directionsQuery.isSuccess && directions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cette entreprise ne possède pas de direction.</p>
            ) : (
              <Select
                value={value.directionId || 'ALL'}
                onValueChange={(next) => onChange({ directionId: !next || next === 'ALL' ? '' : next })}
                items={selectItems(directions, { ALL: 'Toutes les directions' })}
              >
                <SelectTrigger id="filter-direction" className="w-full" disabled={directionsQuery.isLoading}>
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
      ) : null}
    </div>
  );
}
