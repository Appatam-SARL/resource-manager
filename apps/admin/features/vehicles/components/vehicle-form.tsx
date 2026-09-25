'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Vehicle } from '@resource-manager/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompaniesOptions } from '@/hooks/use-companies-options';
import { useAuth } from '@/providers/auth-provider';
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from '@/features/vehicles/schemas/vehicle-schema';

type VehicleFormProps = {
  initial?: Vehicle;
  onSubmit: (values: VehicleFormValues) => Promise<void> | void;
  submitLabel?: string;
  loading?: boolean;
};

export function VehicleForm({
  initial,
  onSubmit,
  submitLabel = 'Enregistrer',
  loading = false,
}: VehicleFormProps) {
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const companiesQuery = useCompaniesOptions(isGroupAdmin);
  const isEdit = Boolean(initial);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      companyId: initial?.companyId ?? user?.companyId ?? '',
      registrationNumber: initial?.registrationNumber ?? '',
      brand: initial?.brand ?? '',
      model: initial?.model ?? '',
      seats: initial?.seats ?? 5,
      description: initial?.description ?? '',
    },
  });

  useEffect(() => {
    if (!isGroupAdmin && user?.companyId) {
      form.setValue('companyId', user.companyId);
    }
  }, [isGroupAdmin, user?.companyId, form]);

  return (
    <form
      className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-border/60"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          ...values,
          description: values.description || undefined,
        });
      })}
    >
      {isGroupAdmin && !isEdit ? (
        <div className="space-y-1.5">
          <Label>Entreprise</Label>
          <Controller
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => field.onChange(value ?? '')}>
                <SelectTrigger className="w-full">
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
            )}
          />
          {form.formState.errors.companyId ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.companyId.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="registrationNumber">Immatriculation</Label>
          <Input
            id="registrationNumber"
            {...form.register('registrationNumber')}
          />
          {form.formState.errors.registrationNumber ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.registrationNumber.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seats">Places</Label>
          <Input
            id="seats"
            type="number"
            min={1}
            {...form.register('seats', { valueAsNumber: true })}
          />
          {form.formState.errors.seats ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.seats.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brand">Marque</Label>
          <Input id="brand" {...form.register('brand')} />
          {form.formState.errors.brand ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.brand.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="model">Modèle</Label>
          <Input id="model" {...form.register('model')} />
          {form.formState.errors.model ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.model.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...form.register('description')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
