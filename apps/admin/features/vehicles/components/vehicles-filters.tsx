'use client';

import type { ResourceStatus } from '@resource-manager/types';
import { ResourceListToolbar } from '@/components/shared/resource-list-toolbar';

type VehiclesFiltersProps = {
  search: string;
  status: ResourceStatus | '';
  companyId: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ResourceStatus | '') => void;
  onCompanyChange: (value: string) => void;
};

export function VehiclesFilters(props: VehiclesFiltersProps) {
  return <ResourceListToolbar {...props} searchPlaceholder="Immatriculation, marque, modèle…" />;
}
