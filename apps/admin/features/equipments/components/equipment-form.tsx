'use client';

import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Equipment } from '@resource-manager/types';
import { FormField } from '@/components/forms/form-field';
import { FormActions, FormCard, FormSection } from '@/components/forms/form-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  EQUIPMENT_SCOPE_DESCRIPTIONS,
  EQUIPMENT_SCOPE_LABELS,
  EQUIPMENT_SCOPES,
} from '@/features/equipments/lib/equipment-display';
import {
  equipmentFormSchema,
  MAX_EQUIPMENT_STOCK,
  type EquipmentFormValues,
} from '@/features/equipments/schemas/equipment-schema';

type EquipmentFormProps = {
  initial?: Equipment;
  onSubmit: (values: EquipmentFormValues) => Promise<void> | void;
  submitLabel?: string;
  loading?: boolean;
  cancelHref?: string;
};

export function EquipmentForm({
  initial,
  onSubmit,
  submitLabel = 'Enregistrer',
  loading = false,
  cancelHref,
}: EquipmentFormProps) {
  const isEdit = Boolean(initial);
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      scope: initial?.scope ?? 'ROOM',
      quantity: initial?.quantity ?? 1,
      description: initial?.description ?? '',
    },
  });
  const { errors, isDirty } = form.formState;
  const scope = form.watch('scope');

  return (
    <FormCard>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit({ ...values, description: values.description || undefined });
            form.reset(values);
          } catch {
            // The mutation already reports the error with a toast; keep the user's input.
          }
        })}
      >
        <FormSection
          title="Informations"
          description="Catalogue commun au Groupe : tout collaborateur peut demander cet équipement avec sa réservation."
        >
          <FormField label="Nom" htmlFor="name" error={errors.name?.message} required wide>
            <Input id="name" placeholder="Vidéoprojecteur" aria-invalid={Boolean(errors.name)} {...form.register('name')} />
          </FormField>
          <FormField
            label="Périmètre"
            htmlFor="scope"
            error={errors.scope?.message}
            hint={EQUIPMENT_SCOPE_DESCRIPTIONS[scope]}
            required
          >
            <Controller
              control={form.control}
              name="scope"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(next) => {
                    if (next) field.onChange(next);
                  }}
                  items={EQUIPMENT_SCOPE_LABELS}
                >
                  <SelectTrigger id="scope" className="w-full" aria-invalid={Boolean(errors.scope)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_SCOPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {EQUIPMENT_SCOPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Quantité"
            htmlFor="quantity"
            error={errors.quantity?.message}
            hint="Nombre d’unités disponibles dans le Groupe."
            required
          >
            <Input
              id="quantity"
              type="number"
              min={1}
              max={MAX_EQUIPMENT_STOCK}
              inputMode="numeric"
              aria-invalid={Boolean(errors.quantity)}
              {...form.register('quantity', { valueAsNumber: true })}
            />
          </FormField>
        </FormSection>

        <FormSection title="Description" description="Modèle, consignes d’utilisation… (facultatif)">
          <FormField label="Description" htmlFor="description" error={errors.description?.message} wide>
            <Textarea id="description" rows={4} {...form.register('description')} />
          </FormField>
        </FormSection>

        <FormActions>
          {cancelHref ? (
            <Link href={cancelHref} className={buttonVariants({ variant: 'outline' })}>
              Annuler
            </Link>
          ) : null}
          <Button type="submit" disabled={loading || (isEdit && !isDirty)}>
            {loading ? 'Enregistrement…' : submitLabel}
          </Button>
        </FormActions>
      </form>
    </FormCard>
  );
}
