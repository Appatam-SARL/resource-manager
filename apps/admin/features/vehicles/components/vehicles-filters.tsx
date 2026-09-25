'use client';

import type { ResourceStatus } from '@resource-manager/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompaniesOptions } from '@/hooks/use-companies-options';
import { RESOURCE_STATUS_LABELS } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

type VehiclesFiltersProps = {
  search: string;
  status: ResourceStatus | '';
  companyId: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ResourceStatus | '') => void;
  onCompanyChange: (value: string) => void;
};

export function VehiclesFilters({
  search,
  status,
  companyId,
  onSearchChange,
  onStatusChange,
  onCompanyChange,
}: VehiclesFiltersProps) {
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const companiesQuery = useCompaniesOptions(isGroupAdmin);

  return (
    <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-border/60 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="vehicle-search">Recherche</Label>
        <Input
          id="vehicle-search"
          placeholder="Immatriculation, marque, modèle…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Statut</Label>
        <Select
          value={status || 'ALL'}
          onValueChange={(value) =>
            onStatusChange(
              !value || value === 'ALL' ? '' : (value as ResourceStatus),
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            {(Object.keys(RESOURCE_STATUS_LABELS) as ResourceStatus[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {RESOURCE_STATUS_LABELS[key]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>
      {isGroupAdmin ? (
        <div className="space-y-1.5">
          <Label>Entreprise</Label>
          <Select
            value={companyId || 'ALL'}
            onValueChange={(value) =>
              onCompanyChange(!value || value === 'ALL' ? '' : value)
            }
          >
            <SelectTrigger className="w-full">
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
    </div>
  );
}
