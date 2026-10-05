'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Vehicle } from '@resource-manager/types';
import { CompanyField } from '@/components/forms/company-field';
import { FormField } from '@/components/forms/form-field';
import { FormActions, FormCard, FormSection } from '@/components/forms/form-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from '@/features/vehicles/schemas/vehicle-schema';
import { VehicleImagePicker } from './vehicle-image-picker';

type VehicleFormProps = {
  initial?: Vehicle;
  /** `imageFile` is only collected on creation; on edit the photo has its own panel. */
  onSubmit: (values: VehicleFormValues, extras: { imageFile: File | null }) => Promise<void> | void;
  submitLabel?: string;
  loading?: boolean;
  cancelHref?: string;
};

export function VehicleForm({
  initial,
  onSubmit,
  submitLabel = 'Enregistrer',
  loading = false,
  cancelHref,
}: VehicleFormProps) {
  const { user } = useAuth();
  const isEdit = Boolean(initial);
  const canChooseCompany = user?.role === 'GROUP_ADMIN' && !isEdit;
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      companyId: initial?.companyId ?? (user?.role === 'GROUP_ADMIN' ? '' : (user?.companyId ?? '')),
      registrationNumber: initial?.registrationNumber ?? '',
      brand: initial?.brand ?? '',
      model: initial?.model ?? '',
      seats: initial?.seats ?? 5,
      description: initial?.description ?? '',
    },
  });
  const { errors, isDirty } = form.formState;

  return (
    <FormCard>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit({ ...values, description: values.description || undefined }, { imageFile });
            form.reset(values);
          } catch {
            // The mutation already reports the error with a toast; keep the user's input.
          }
        })}
      >
        <FormSection title="Rattachement" description="Entreprise gestionnaire du véhicule. Elle seule peut le modifier ; tout le Groupe peut le réserver.">
          <Controller
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <CompanyField
                value={field.value}
                onChange={field.onChange}
                editable={canChooseCompany}
                companyName={initial?.company?.name ?? user?.company.name}
                error={errors.companyId?.message}
              />
            )}
          />
        </FormSection>

        <FormSection title="Identification" description="Informations visibles lors de la réservation.">
          <FormField label="Immatriculation" htmlFor="registrationNumber" error={errors.registrationNumber?.message} required>
            <Input
              id="registrationNumber"
              autoComplete="off"
              placeholder="AB-123-CD"
              className="font-mono uppercase"
              aria-invalid={Boolean(errors.registrationNumber)}
              {...form.register('registrationNumber')}
            />
          </FormField>
          <FormField label="Nombre de places" htmlFor="seats" error={errors.seats?.message} hint="Conducteur compris." required>
            <Input
              id="seats"
              type="number"
              min={1}
              inputMode="numeric"
              aria-invalid={Boolean(errors.seats)}
              {...form.register('seats', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Marque" htmlFor="brand" error={errors.brand?.message} required>
            <Input id="brand" placeholder="Toyota" aria-invalid={Boolean(errors.brand)} {...form.register('brand')} />
          </FormField>
          <FormField label="Modèle" htmlFor="model" error={errors.model?.message} required>
            <Input id="model" placeholder="Hilux" aria-invalid={Boolean(errors.model)} {...form.register('model')} />
          </FormField>
        </FormSection>

        <FormSection title="Description" description="Équipements, consignes d’utilisation… (facultatif)">
          <FormField label="Description" htmlFor="description" error={errors.description?.message} wide>
            <Textarea id="description" rows={4} {...form.register('description')} />
          </FormField>
        </FormSection>

        {!isEdit ? (
          <FormSection title="Photo" description="Facultative. Aide les collaborateurs à reconnaître le véhicule.">
            <VehicleImagePicker file={imageFile} onChange={setImageFile} disabled={loading} />
          </FormSection>
        ) : null}

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
