'use client';

import { useEffect } from 'react';
import { Info } from 'lucide-react';
import { FormField } from '@/components/forms/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { selectItems } from '@/lib/select-items';
import { Skeleton } from '@/components/ui/skeleton';
import { useDirections } from '@/features/directions/hooks/use-directions';

type DirectionFieldProps = {
  companyId: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Called once the company's directions are known. */
  onAvailabilityChange?: (hasDirections: boolean) => void;
  hint?: string;
};

/**
 * Optional direction: only shown when the company has directions.
 * A company without direction is a normal situation — the user is attached to the company.
 */
export function DirectionField({ companyId, value, onChange, onAvailabilityChange, hint }: DirectionFieldProps) {
  const query = useDirections(
    { companyId: companyId || undefined, page: 1, limit: 100, status: 'ACTIVE' },
    { enabled: Boolean(companyId) },
  );
  const directions = query.data?.data ?? [];
  const known = Boolean(companyId) && query.isSuccess;
  const hasDirections = directions.length > 0;

  useEffect(() => {
    if (known) onAvailabilityChange?.(hasDirections);
  }, [known, hasDirections, onAvailabilityChange]);

  if (!companyId) {
    return (
      <FormField label="Direction" wide>
        <p className="text-sm text-muted-foreground">Choisissez d’abord une entreprise.</p>
      </FormField>
    );
  }

  if (query.isLoading) {
    return (
      <FormField label="Direction" wide>
        <Skeleton className="h-9 w-full" />
      </FormField>
    );
  }

  if (known && !hasDirections) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground @md:col-span-2">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Cette entreprise ne possède pas de direction : l’utilisateur sera rattaché directement à l’entreprise.
          {hint ? ` ${hint}` : ''}
        </span>
      </div>
    );
  }

  return (
    <FormField label="Direction" htmlFor="directionId" hint={hint ?? 'Facultative.'} wide>
      <Select
        value={value ?? 'none'}
        onValueChange={(next) => onChange(!next || next === 'none' ? null : next)}
        items={selectItems(directions, { none: 'Aucune direction (rattaché à l’entreprise)' })}
      >
        <SelectTrigger id="directionId" className="w-full">
          <SelectValue placeholder="Aucune direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Aucune direction (rattaché à l’entreprise)</SelectItem>
          {directions.map((direction) => (
            <SelectItem key={direction.id} value={direction.id}>
              {direction.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
