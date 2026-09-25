'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Company } from '@resource-manager/types';

type DirectionFiltersProps = {
  search: string;
  status: string;
  companyId: string;
  companies: Company[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
};

export function DirectionFilters({
  search,
  status,
  companyId,
  companies,
  onSearchChange,
  onStatusChange,
  onCompanyChange,
}: DirectionFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border/60 lg:flex-row lg:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="direction-search">Recherche</Label>
        <Input
          id="direction-search"
          placeholder="Nom ou code…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="w-full space-y-2 lg:w-56">
        <Label>Entreprise</Label>
        <Select
          value={companyId}
          onValueChange={(value) => onCompanyChange(value ?? 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Toutes les entreprises" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full space-y-2 lg:w-44">
        <Label>Statut</Label>
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value ?? 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="INACTIVE">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
