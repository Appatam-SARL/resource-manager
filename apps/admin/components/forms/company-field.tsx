'use client';

import { Building2 } from 'lucide-react';
import { FormField } from '@/components/forms/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { selectItems } from '@/lib/select-items';
import { useCompaniesOptions } from '@/hooks/use-companies-options';

type CompanyFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** Only the Group admin chooses the company, and only on creation. */
  editable: boolean;
  /** Displayed when not editable. */
  companyName?: string;
  error?: string;
  hint?: string;
};

/** Company of a resource / direction / user: a select for the Group admin, a read-only value otherwise. */
export function CompanyField({ value, onChange, editable, companyName, error, hint }: CompanyFieldProps) {
  const companiesQuery = useCompaniesOptions(editable);

  if (!editable) {
    return (
      <FormField label="Entreprise" hint={hint ?? 'Le rattachement à l’entreprise ne peut pas être modifié.'} wide>
        <div className="flex h-9 items-center gap-2 rounded-lg bg-muted/60 px-3 text-sm text-foreground ring-1 ring-border">
          <Building2 className="size-4 text-muted-foreground" aria-hidden />
          {companyName ?? '—'}
        </div>
      </FormField>
    );
  }

  return (
    <FormField label="Entreprise" htmlFor="companyId" error={error} hint={hint} required wide>
      <Select value={value} onValueChange={(next) => onChange(next ?? '')} items={selectItems(companiesQuery.data ?? [])}>
        <SelectTrigger id="companyId" className="w-full" aria-invalid={Boolean(error)}>
          <SelectValue placeholder="Sélectionner une entreprise" />
        </SelectTrigger>
        <SelectContent>
          {(companiesQuery.data ?? []).map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
