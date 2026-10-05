'use client';

import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MeetingRoom } from '@resource-manager/types';
import { CompanyField } from '@/components/forms/company-field';
import { FormField } from '@/components/forms/form-field';
import { FormActions, FormCard, FormSection } from '@/components/forms/form-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import {
  roomFormSchema,
  type RoomFormValues,
} from '@/features/rooms/schemas/room-schema';

type RoomFormProps = {
  initial?: MeetingRoom;
  onSubmit: (values: RoomFormValues) => Promise<void> | void;
  submitLabel?: string;
  loading?: boolean;
  cancelHref?: string;
};

export function RoomForm({
  initial,
  onSubmit,
  submitLabel = 'Enregistrer',
  loading = false,
  cancelHref,
}: RoomFormProps) {
  const { user } = useAuth();
  const isEdit = Boolean(initial);
  const canChooseCompany = user?.role === 'GROUP_ADMIN' && !isEdit;

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      companyId: initial?.companyId ?? (user?.role === 'GROUP_ADMIN' ? '' : (user?.companyId ?? '')),
      name: initial?.name ?? '',
      location: initial?.location ?? '',
      capacity: initial?.capacity ?? 10,
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
            await onSubmit({
              ...values,
              location: values.location || undefined,
              description: values.description || undefined,
            });
            form.reset(values);
          } catch {
            // The mutation already reports the error with a toast; keep the user's input.
          }
        })}
      >
        <FormSection title="Rattachement" description="Entreprise gestionnaire de la salle. Elle seule peut la modifier ; tout le Groupe peut la réserver.">
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

        <FormSection title="Informations" description="Nom et emplacement affichés lors de la réservation.">
          <FormField label="Nom" htmlFor="name" error={errors.name?.message} required wide>
            <Input id="name" placeholder="Salle Baobab" aria-invalid={Boolean(errors.name)} {...form.register('name')} />
          </FormField>
          <FormField label="Localisation" htmlFor="location" error={errors.location?.message} hint="Bâtiment, étage…">
            <Input id="location" placeholder="Siège — 2ᵉ étage" {...form.register('location')} />
          </FormField>
          <FormField label="Capacité" htmlFor="capacity" error={errors.capacity?.message} hint="Nombre maximal de participants." required>
            <Input
              id="capacity"
              type="number"
              min={1}
              inputMode="numeric"
              aria-invalid={Boolean(errors.capacity)}
              {...form.register('capacity', { valueAsNumber: true })}
            />
          </FormField>
        </FormSection>

        <FormSection title="Description" description="Équipements disponibles, consignes… (facultatif)">
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
