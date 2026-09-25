'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Company, Direction } from '@resource-manager/types';
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
import { Textarea } from '@/components/ui/textarea';
import {
  createDirectionSchema,
  updateDirectionSchema,
  toDirectionPayload,
  type CreateDirectionFormValues,
  type UpdateDirectionFormValues,
} from '@/features/directions/schemas/direction-schema';

type DirectionFormCreateProps = {
  mode: 'create';
  companies: Company[];
  onSubmit: (values: ReturnType<typeof toDirectionPayload>) => Promise<void>;
  submitLabel?: string;
};

type DirectionFormEditProps = {
  mode: 'edit';
  direction: Direction;
  onSubmit: (values: ReturnType<typeof toDirectionPayload>) => Promise<void>;
  submitLabel?: string;
};

type DirectionFormProps = DirectionFormCreateProps | DirectionFormEditProps;

export function DirectionForm(props: DirectionFormProps) {
  if (props.mode === 'create') {
    return <CreateDirectionForm {...props} />;
  }
  return <EditDirectionForm {...props} />;
}

function CreateDirectionForm({
  companies,
  onSubmit,
  submitLabel,
}: DirectionFormCreateProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDirectionFormValues>({
    resolver: zodResolver(createDirectionSchema),
    defaultValues: {
      companyId: '',
      name: '',
      code: '',
      description: '',
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(
          toDirectionPayload({
            companyId: values.companyId,
            name: values.name,
            code: values.code,
            description: values.description,
          }),
        );
      })}
    >
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
              <SelectTrigger className="w-full" aria-invalid={Boolean(errors.companyId)}>
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

      <div className="space-y-2">
        <Label htmlFor="direction-name">Nom</Label>
        <Input
          id="direction-name"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="direction-code">Code (optionnel)</Label>
        <Input
          id="direction-code"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.code)}
          {...register('code')}
        />
        {errors.code ? (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="direction-description">Description (optionnelle)</Label>
        <Textarea
          id="direction-description"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.description)}
          {...register('description')}
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Enregistrement…'
            : (submitLabel ?? 'Créer la direction')}
        </Button>
      </div>
    </form>
  );
}

function EditDirectionForm({
  direction,
  onSubmit,
  submitLabel,
}: DirectionFormEditProps) {
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

  useEffect(() => {
    reset({
      name: direction.name,
      code: direction.code ?? '',
      description: direction.description ?? '',
    });
  }, [direction, reset]);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(
          toDirectionPayload({
            name: values.name,
            code: values.code,
            description: values.description,
          }),
        );
      })}
    >
      <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Entreprise : </span>
        <span className="font-medium">
          {direction.company?.name ?? '—'}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-direction-name">Nom</Label>
        <Input
          id="edit-direction-name"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-direction-code">Code (optionnel)</Label>
        <Input
          id="edit-direction-code"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.code)}
          {...register('code')}
        />
        {errors.code ? (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-direction-description">
          Description (optionnelle)
        </Label>
        <Textarea
          id="edit-direction-description"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.description)}
          {...register('description')}
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : (submitLabel ?? 'Enregistrer')}
        </Button>
      </div>
    </form>
  );
}
