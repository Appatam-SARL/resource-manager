'use client';

import type { ResourceStatus } from '@resource-manager/types';
import { ResourceListToolbar } from '@/components/shared/resource-list-toolbar';

type RoomsFiltersProps = {
  search: string;
  status: ResourceStatus | '';
  companyId: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ResourceStatus | '') => void;
  onCompanyChange: (value: string) => void;
};

export function RoomsFilters(props: RoomsFiltersProps) {
  return <ResourceListToolbar {...props} searchPlaceholder="Nom ou localisation…" />;
}
