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

type CompanyFiltersProps = {
  search: string;
  status: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export function CompanyFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: CompanyFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border/60 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="company-search">Recherche</Label>
        <Input
          id="company-search"
          placeholder="Nom ou code…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="w-full space-y-2 sm:w-48">
        <Label>Statut</Label>
        <Select value={status} onValueChange={(value) => onStatusChange(value ?? 'all')}>
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
