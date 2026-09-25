'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type {
  Company,
  Direction,
  Role,
  User,
} from '@resource-manager/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDirections } from '@/features/directions/hooks/use-directions';
import {
  createUserSchema,
  updateUserSchema,
  toCreateUserPayload,
  toUpdateUserPayload,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from '@/features/users/schemas/user-schema';
import { ROLE_LABELS } from '@/lib/rbac';

const ROLES: Role[] = [
  'GROUP_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
  'EMPLOYEE',
];

type UserFormCreateProps = {
  mode: 'create';
  companies: Company[];
  onSubmit: (values: ReturnType<typeof toCreateUserPayload>) => Promise<void>;
  submitLabel?: string;
};

type UserFormEditProps = {
  mode: 'edit';
  user: User;
  onSubmit: (values: ReturnType<typeof toUpdateUserPayload>) => Promise<void>;
  submitLabel?: string;
};

type UserFormProps = UserFormCreateProps | UserFormEditProps;

export function UserForm(props: UserFormProps) {
  if (props.mode === 'create') {
    return <CreateUserForm {...props} />;
  }
  return <EditUserForm {...props} />;
}

function CreateUserForm({
  companies,
  onSubmit,
  submitLabel,
}: UserFormCreateProps) {
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
      companyId: '',
      directionId: null,
    },
  });

  const companyId = useWatch({ control, name: 'companyId' });

  const { data: directionsData, isFetching: directionsLoading } = useDirections(
    {
      companyId: companyId || undefined,
      page: 1,
      limit: 100,
      status: 'ACTIVE',
    },
    { enabled: Boolean(companyId) },
  );

  const directions: Direction[] = companyId
    ? (directionsData?.data ?? [])
    : [];
  const hasDirections = directions.length > 0;

  useEffect(() => {
    setValue('directionId', null);
  }, [companyId, setValue]);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(
          toCreateUserPayload({
            ...values,
            directionId: hasDirections ? values.directionId || null : null,
          }),
        );
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="user-firstName">Prénom</Label>
          <Input
            id="user-firstName"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.firstName)}
            {...register('firstName')}
          />
          {errors.firstName ? (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-lastName">Nom</Label>
          <Input
            id="user-lastName"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.lastName)}
            {...register('lastName')}
          />
          {errors.lastName ? (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-email">E-mail</Label>
        <Input
          id="user-email"
          type="email"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-password">Mot de passe</Label>
        <Input
          id="user-password"
          type="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Entreprise</Label>
        <Controller
          name="companyId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={(value) => field.onChange(value ?? '')}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={Boolean(errors.companyId)}
              >
                <SelectValue placeholder="Sélectionner une entreprise" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.companyId ? (
          <p className="text-sm text-destructive">{errors.companyId.message}</p>
        ) : null}
      </div>

      {companyId && hasDirections ? (
        <div className="space-y-2">
          <Label>Direction (optionnelle)</Label>
          <Controller
            name="directionId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? 'none'}
                onValueChange={(value) =>
                  field.onChange(value === 'none' ? null : (value ?? null))
                }
                disabled={directionsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucune direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune direction</SelectItem>
                  {directions.map((direction) => (
                    <SelectItem key={direction.id} value={direction.id}>
                      {direction.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      ) : null}

      {companyId && !directionsLoading && !hasDirections ? (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Cette entreprise n’a pas de direction. L’utilisateur sera rattaché
          directement à l’entreprise.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label>Rôle</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) =>
                field.onChange((value as Role | null) ?? 'EMPLOYEE')
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Enregistrement…'
            : (submitLabel ?? 'Créer l’utilisateur')}
        </Button>
      </div>
    </form>
  );
}

function EditUserForm({ user, onSubmit, submitLabel }: UserFormEditProps) {
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

  const { data: directionsData, isFetching: directionsLoading } = useDirections({
    companyId: user.companyId,
    page: 1,
    limit: 100,
    status: 'ACTIVE',
  });

  const directions: Direction[] = directionsData?.data ?? [];
  const hasDirections = directions.length > 0;

  useEffect(() => {
    reset({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      directionId: user.directionId,
    });
  }, [user, reset]);

  useEffect(() => {
    if (!hasDirections && !directionsLoading) {
      setValue('directionId', null);
    }
  }, [hasDirections, directionsLoading, setValue]);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(
          toUpdateUserPayload({
            ...values,
            directionId: hasDirections ? values.directionId || null : null,
          }),
        );
      })}
    >
      <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Entreprise : </span>
        <span className="font-medium">{user.company?.name ?? '—'}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-user-firstName">Prénom</Label>
          <Input
            id="edit-user-firstName"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.firstName)}
            {...register('firstName')}
          />
          {errors.firstName ? (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-user-lastName">Nom</Label>
          <Input
            id="edit-user-lastName"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.lastName)}
            {...register('lastName')}
          />
          {errors.lastName ? (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-user-email">E-mail</Label>
        <Input
          id="edit-user-email"
          type="email"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-user-password">
          Nouveau mot de passe (optionnel)
        </Label>
        <Input
          id="edit-user-password"
          type="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      {hasDirections ? (
        <div className="space-y-2">
          <Label>Direction (optionnelle)</Label>
          <Controller
            name="directionId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? 'none'}
                onValueChange={(value) =>
                  field.onChange(value === 'none' ? null : (value ?? null))
                }
                disabled={directionsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucune direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune direction</SelectItem>
                  {directions.map((direction) => (
                    <SelectItem key={direction.id} value={direction.id}>
                      {direction.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      ) : (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Cette entreprise n’a pas de direction. Aucun rattachement direction
          n’est requis.
        </p>
      )}

      <div className="space-y-2">
        <Label>Rôle</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) =>
                field.onChange((value as Role | null) ?? user.role)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : (submitLabel ?? 'Enregistrer')}
        </Button>
      </div>
    </form>
  );
}
