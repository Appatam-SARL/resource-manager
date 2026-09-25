'use client';

import type { Company, Role } from '@resource-manager/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_LABELS } from '@/lib/rbac';

const ROLES: Role[] = [
  'GROUP_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
  'EMPLOYEE',
];

type UserFiltersProps = {
  search: string;
  status: string;
  role: string;
  companyId: string;
  companies: Company[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
};

export function UserFilters({
  search,
  status,
  role,
  companyId,
  companies,
  onSearchChange,
  onStatusChange,
  onRoleChange,
  onCompanyChange,
}: UserFiltersProps) {
  return (
    <div className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-border/60 sm:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2 sm:col-span-2 xl:col-span-1">
        <Label htmlFor="user-search">Recherche</Label>
        <Input
          id="user-search"
          placeholder="Nom, prénom ou e-mail…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Entreprise</Label>
        <Select
          value={companyId}
          onValueChange={(value) => onCompanyChange(value ?? 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Toutes" />
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
      <div className="space-y-2">
        <Label>Rôle</Label>
        <Select
          value={role}
          onValueChange={(value) => onRoleChange(value ?? 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {ROLES.map((item) => (
              <SelectItem key={item} value={item}>
                {ROLE_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Statut</Label>
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value ?? 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tous" />
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
