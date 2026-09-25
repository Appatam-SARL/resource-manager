'use client';

import type { ReservationStatus, ResourceType } from '@resource-manager/types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompaniesOptions } from '@/hooks/use-companies-options';
import {
  RESERVATION_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
} from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

type ReservationsFiltersProps = {
  status: ReservationStatus | '';
  resourceType: ResourceType | '';
  companyId: string;
  onStatusChange: (value: ReservationStatus | '') => void;
  onResourceTypeChange: (value: ResourceType | '') => void;
  onCompanyChange: (value: string) => void;
};

export function ReservationsFilters({
  status,
  resourceType,
  companyId,
  onStatusChange,
  onResourceTypeChange,
  onCompanyChange,
}: ReservationsFiltersProps) {
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const companiesQuery = useCompaniesOptions(isGroupAdmin);

  return (
    <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-border/60 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Statut</Label>
        <Select
          value={status || 'ALL'}
          onValueChange={(value) =>
            onStatusChange(
              !value || value === 'ALL' ? '' : (value as ReservationStatus),
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            {(
              Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]
            ).map((key) => (
              <SelectItem key={key} value={key}>
                {RESERVATION_STATUS_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select
          value={resourceType || 'ALL'}
          onValueChange={(value) =>
            onResourceTypeChange(
              !value || value === 'ALL' ? '' : (value as ResourceType),
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les types</SelectItem>
            {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {RESOURCE_TYPE_LABELS[key]}
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
