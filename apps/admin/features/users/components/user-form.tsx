'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { User } from '@resource-manager/types';
import { CompanyField } from '@/components/forms/company-field';
import { FormField } from '@/components/forms/form-field';
import { FormActions, FormCard, FormSection } from '@/components/forms/form-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DirectionField } from '@/features/users/components/direction-field';
import { RoleSelector } from '@/features/users/components/role-selector';
import { assignableRoles, directionScopeHint } from '@/features/users/lib/user-roles';
import {
  createUserSchema,
  updateUserSchema,
  toCreateUserPayload,
  toUpdateUserPayload,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from '@/features/users/schemas/user-schema';
import { useAuth } from '@/providers/auth-provider';

type UserFormCreateProps = {
  mode: 'create';
  onSubmit: (values: ReturnType<typeof toCreateUserPayload>) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
};

type UserFormEditProps = {
  mode: 'edit';
  user: User;
  onSubmit: (values: ReturnType<typeof toUpdateUserPayload>) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
  /** Account the current user is not allowed to manage: fields shown, not editable. */
  readOnly?: boolean;
};

type UserFormProps = UserFormCreateProps | UserFormEditProps;

export function UserForm(props: UserFormProps) {
  if (props.mode === 'create') {
    return <CreateUserForm {...props} />;
  }
  return <EditUserForm key={props.user.updatedAt} {...props} />;
}

function CancelLink({ href }: { href?: string }) {
  if (!href) return null;
  return (
    <Link href={href} className={buttonVariants({ variant: 'outline' })}>
      Annuler
    </Link>
  );
}

function CreateUserForm({ onSubmit, submitLabel, cancelHref }: UserFormCreateProps) {
  const { user: actor } = useAuth();
  const isGroupAdmin = actor?.role === 'GROUP_ADMIN';
  const [hasDirections, setHasDirections] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'EMPLOYEE',
      companyId: isGroupAdmin ? '' : (actor?.companyId ?? ''),
      directionId: null,
    },
  });

  const companyId = useWatch({ control, name: 'companyId' });
  const role = useWatch({ control, name: 'role' });
  const directionId = useWatch({ control, name: 'directionId' });

  return (
    <FormCard>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          await onSubmit(
            toCreateUserPayload({ ...values, directionId: hasDirections ? values.directionId || null : null }),
          );
        })}
      >
        <FormSection title="Identité" description="Nom affiché dans les réservations et les notifications.">
          <FormField label="Prénom" htmlFor="user-firstName" error={errors.firstName?.message} required>
            <Input id="user-firstName" autoComplete="given-name" disabled={isSubmitting} aria-invalid={Boolean(errors.firstName)} {...register('firstName')} />
          </FormField>
          <FormField label="Nom" htmlFor="user-lastName" error={errors.lastName?.message} required>
            <Input id="user-lastName" autoComplete="family-name" disabled={isSubmitting} aria-invalid={Boolean(errors.lastName)} {...register('lastName')} />
          </FormField>
        </FormSection>

        <FormSection title="Accès" description="Identifiants de connexion. Communiquez le mot de passe par un canal sécurisé.">
          <FormField label="Adresse e-mail" htmlFor="user-email" error={errors.email?.message} required wide>
            <Input id="user-email" type="email" autoComplete="off" disabled={isSubmitting} aria-invalid={Boolean(errors.email)} {...register('email')} />
          </FormField>
          <FormField
            label="Mot de passe provisoire"
            htmlFor="user-password"
            error={errors.password?.message}
            hint="8 caractères minimum."
            required
            wide
          >
            <Input id="user-password" type="password" autoComplete="new-password" disabled={isSubmitting} aria-invalid={Boolean(errors.password)} {...register('password')} />
          </FormField>
        </FormSection>

        <FormSection title="Organisation" description="Entreprise obligatoire ; direction uniquement si l’entreprise en possède.">
          <Controller
            name="companyId"
            control={control}
            render={({ field }) => (
              <CompanyField
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  setValue('directionId', null);
                }}
                editable={isGroupAdmin}
                companyName={actor?.company.name}
                hint={isGroupAdmin ? undefined : 'Les utilisateurs sont créés dans votre entreprise.'}
                error={errors.companyId?.message}
              />
            )}
          />
          <DirectionField
            companyId={companyId}
            value={directionId}
            onChange={(next) => setValue('directionId', next, { shouldDirty: true })}
            onAvailabilityChange={setHasDirections}
            hint={directionScopeHint(role, Boolean(directionId))}
          />
        </FormSection>

        <FormSection title="Rôle" description="Détermine ce que l’utilisateur peut voir et faire.">
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <RoleSelector
                value={field.value}
                onChange={field.onChange}
                roles={actor ? assignableRoles(actor.role) : []}
                disabled={isSubmitting}
              />
            )}
          />
        </FormSection>

        <FormActions>
          <CancelLink href={cancelHref} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Création…' : (submitLabel ?? 'Créer l’utilisateur')}
          </Button>
        </FormActions>
      </form>
    </FormCard>
  );
}

function EditUserForm({ user, onSubmit, submitLabel, cancelHref, readOnly = false }: UserFormEditProps) {
  const { user: actor } = useAuth();
  const [hasDirections, setHasDirections] = useState(Boolean(user.directionId));
  const isSelf = actor?.id === user.id;
  const actorRoles = actor ? assignableRoles(actor.role) : [];
  const canChangeRole = !readOnly && !isSelf && actorRoles.includes(user.role);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      directionId: user.directionId,
    },
  });

  const role = useWatch({ control, name: 'role' });
  const directionId = useWatch({ control, name: 'directionId' });

  const handleAvailability = useCallback(
    (available: boolean) => {
      setHasDirections(available);
      if (!available) setValue('directionId', null);
    },
    [setValue],
  );

  return (
    <FormCard>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          try {
            await onSubmit(
              toUpdateUserPayload({ ...values, directionId: hasDirections ? values.directionId || null : null }),
            );
            reset({ ...values, password: '' });
          } catch {
            // The page reports the error; keep the user's input.
          }
        })}
      >
        <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
        <FormSection title="Identité">
          <FormField label="Prénom" htmlFor="edit-user-firstName" error={errors.firstName?.message} required>
            <Input id="edit-user-firstName" disabled={isSubmitting} aria-invalid={Boolean(errors.firstName)} {...register('firstName')} />
          </FormField>
          <FormField label="Nom" htmlFor="edit-user-lastName" error={errors.lastName?.message} required>
            <Input id="edit-user-lastName" disabled={isSubmitting} aria-invalid={Boolean(errors.lastName)} {...register('lastName')} />
          </FormField>
        </FormSection>

        <FormSection title="Accès">
          <FormField label="Adresse e-mail" htmlFor="edit-user-email" error={errors.email?.message} required wide>
            <Input id="edit-user-email" type="email" autoComplete="off" disabled={isSubmitting} aria-invalid={Boolean(errors.email)} {...register('email')} />
          </FormField>
          {readOnly ? null : (
            <FormField
              label="Nouveau mot de passe"
              htmlFor="edit-user-password"
              error={errors.password?.message}
              hint="Laissez vide pour conserver le mot de passe actuel."
              wide
            >
              <Input id="edit-user-password" type="password" autoComplete="new-password" disabled={isSubmitting} aria-invalid={Boolean(errors.password)} {...register('password')} />
            </FormField>
          )}
        </FormSection>

        <FormSection title="Organisation">
          <CompanyField value={user.companyId} onChange={() => undefined} editable={false} companyName={user.company?.name} />
          <DirectionField
            companyId={user.companyId}
            value={directionId}
            onChange={(next) => setValue('directionId', next, { shouldDirty: true })}
            onAvailabilityChange={handleAvailability}
            hint={directionScopeHint(role, Boolean(directionId))}
          />
        </FormSection>

        <FormSection
          title="Rôle"
          description={
            readOnly
              ? undefined
              : isSelf
              ? 'Vous ne pouvez pas modifier votre propre rôle.'
              : canChangeRole
                ? 'Détermine ce que l’utilisateur peut voir et faire.'
                : 'Ce rôle ne peut pas être modifié avec vos droits.'
          }
        >
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <RoleSelector
                value={field.value}
                onChange={field.onChange}
                roles={canChangeRole ? actorRoles : [user.role]}
                disabled={isSubmitting || !canChangeRole}
              />
            )}
          />
        </FormSection>
        </fieldset>

        {readOnly ? null : (
          <FormActions className="mt-6">
            <CancelLink href={cancelHref} />
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : (submitLabel ?? 'Enregistrer les modifications')}
            </Button>
          </FormActions>
        )}
      </form>
    </FormCard>
  );
}
