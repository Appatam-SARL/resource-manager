'use client';

import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Direction } from '@resource-manager/types';
import { CompanyField } from '@/components/forms/company-field';
import { FormField } from '@/components/forms/form-field';
import { FormActions, FormCard, FormSection } from '@/components/forms/form-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createDirectionSchema,
  updateDirectionSchema,
  toDirectionPayload,
  type CreateDirectionFormValues,
  type UpdateDirectionFormValues,
} from '@/features/directions/schemas/direction-schema';
import { useAuth } from '@/providers/auth-provider';

type DirectionFormCreateProps = {
  mode: 'create';
  /** Preselected company (Group admin only — other roles always create in their own company). */
  initialCompanyId?: string;
  onSubmit: (values: ReturnType<typeof toDirectionPayload>) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
};

type DirectionFormEditProps = {
  mode: 'edit';
  direction: Direction;
  onSubmit: (values: ReturnType<typeof toDirectionPayload>) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
};

type DirectionFormProps = DirectionFormCreateProps | DirectionFormEditProps;

export function DirectionForm(props: DirectionFormProps) {
  if (props.mode === 'create') {
    return <CreateDirectionForm {...props} />;
  }
  return <EditDirectionForm key={props.direction.updatedAt} {...props} />;
}

function CancelLink({ href }: { href?: string }) {
  if (!href) return null;
  return (
    <Link href={href} className={buttonVariants({ variant: 'outline' })}>
      Annuler
    </Link>
  );
}

const IDENTIFICATION_DESCRIPTION = 'Nom affiché lors du rattachement des utilisateurs, et code interne éventuel.';

function CreateDirectionForm({ initialCompanyId, onSubmit, submitLabel, cancelHref }: DirectionFormCreateProps) {
  const { user: actor } = useAuth();
  const isGroupAdmin = actor?.role === 'GROUP_ADMIN';

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDirectionFormValues>({
    resolver: zodResolver(createDirectionSchema),
    defaultValues: {
      companyId: isGroupAdmin ? (initialCompanyId ?? '') : (actor?.companyId ?? ''),
      name: '',
      code: '',
      description: '',
    },
  });

  return (
    <FormCard>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          await onSubmit(toDirectionPayload(values));
        })}
      >
        <FormSection title="Rattachement" description="Une direction appartient toujours à une seule entreprise.">
          <Controller
            name="companyId"
            control={control}
            render={({ field }) => (
              <CompanyField
                value={field.value}
                onChange={field.onChange}
                editable={isGroupAdmin}
                companyName={actor?.company.name}
                hint={isGroupAdmin ? undefined : 'Les directions sont créées dans votre entreprise.'}
                error={errors.companyId?.message}
              />
            )}
          />
        </FormSection>

        <FormSection title="Identification" description={IDENTIFICATION_DESCRIPTION}>
          <FormField label="Nom" htmlFor="direction-name" error={errors.name?.message} required>
            <Input id="direction-name" disabled={isSubmitting} aria-invalid={Boolean(errors.name)} {...register('name')} />
          </FormField>
          <FormField label="Code" htmlFor="direction-code" error={errors.code?.message} hint="Optionnel, 32 caractères maximum.">
            <Input id="direction-code" className="font-mono" disabled={isSubmitting} aria-invalid={Boolean(errors.code)} {...register('code')} />
          </FormField>
        </FormSection>

        <FormSection title="Présentation" description="Missions ou périmètre de la direction.">
          <FormField label="Description" htmlFor="direction-description" error={errors.description?.message} hint="Optionnelle, 500 caractères maximum." wide>
            <Textarea id="direction-description" rows={4} disabled={isSubmitting} aria-invalid={Boolean(errors.description)} {...register('description')} />
          </FormField>
        </FormSection>

        <FormActions>
          <CancelLink href={cancelHref} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Création…' : (submitLabel ?? 'Créer la direction')}
          </Button>
        </FormActions>
      </form>
    </FormCard>
  );
}

function EditDirectionForm({ direction, onSubmit, submitLabel, cancelHref }: DirectionFormEditProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateDirectionFormValues>({
    resolver: zodResolver(updateDirectionSchema),
    defaultValues: {
      name: direction.name,
      code: direction.code ?? '',
      description: direction.description ?? '',
    },
  });

  return (
    <FormCard>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          try {
            await onSubmit(toDirectionPayload(values));
            reset(values);
          } catch {
            // The page reports the error; keep the user's input.
          }
        })}
      >
        <FormSection title="Rattachement">
          <CompanyField
            value={direction.companyId}
            onChange={() => undefined}
            editable={false}
            companyName={direction.company?.name}
          />
        </FormSection>

        <FormSection title="Identification" description={IDENTIFICATION_DESCRIPTION}>
          <FormField label="Nom" htmlFor="edit-direction-name" error={errors.name?.message} required>
            <Input id="edit-direction-name" disabled={isSubmitting} aria-invalid={Boolean(errors.name)} {...register('name')} />
          </FormField>
          <FormField label="Code" htmlFor="edit-direction-code" error={errors.code?.message} hint="Optionnel, 32 caractères maximum.">
            <Input id="edit-direction-code" className="font-mono" disabled={isSubmitting} aria-invalid={Boolean(errors.code)} {...register('code')} />
          </FormField>
        </FormSection>

        <FormSection title="Présentation">
          <FormField label="Description" htmlFor="edit-direction-description" error={errors.description?.message} hint="Optionnelle, 500 caractères maximum." wide>
            <Textarea id="edit-direction-description" rows={4} disabled={isSubmitting} aria-invalid={Boolean(errors.description)} {...register('description')} />
          </FormField>
        </FormSection>

        <FormActions>
          <CancelLink href={cancelHref} />
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : (submitLabel ?? 'Enregistrer les modifications')}
          </Button>
        </FormActions>
      </form>
    </FormCard>
  );
}
