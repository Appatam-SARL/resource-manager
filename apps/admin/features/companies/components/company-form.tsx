'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Company } from '@resource-manager/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createCompanySchema,
  updateCompanySchema,
  toCompanyPayload,
  type CreateCompanyFormValues,
  type UpdateCompanyFormValues,
} from '@/features/companies/schemas/company-schema';

type CompanyFormCreateProps = {
  mode: 'create';
  groupId: string;
  onSubmit: (values: ReturnType<typeof toCompanyPayload>) => Promise<void>;
  submitLabel?: string;
};

type CompanyFormEditProps = {
  mode: 'edit';
  company: Company;
  onSubmit: (values: ReturnType<typeof toCompanyPayload>) => Promise<void>;
  submitLabel?: string;
};

type CompanyFormProps = CompanyFormCreateProps | CompanyFormEditProps;

export function CompanyForm(props: CompanyFormProps) {
  if (props.mode === 'create') {
    return <CreateCompanyForm {...props} />;
  }
  return <EditCompanyForm {...props} />;
}

function CreateCompanyForm({
  groupId,
  onSubmit,
  submitLabel,
}: CompanyFormCreateProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      groupId,
      name: '',
      code: '',
      description: '',
    },
  });

  useEffect(() => {
    reset({
      groupId,
      name: '',
      code: '',
      description: '',
    });
  }, [groupId, reset]);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(
          toCompanyPayload({
            groupId: values.groupId,
            name: values.name,
            code: values.code,
            description: values.description,
          }),
        );
      })}
    >
      <input type="hidden" {...register('groupId')} />
      <div className="space-y-2">
        <Label htmlFor="company-name">Nom</Label>
        <Input
          id="company-name"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="company-code">Code (optionnel)</Label>
        <Input
          id="company-code"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.code)}
          {...register('code')}
        />
        {errors.code ? (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="company-description">Description (optionnelle)</Label>
        <Textarea
          id="company-description"
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
            : (submitLabel ?? 'Créer l’entreprise')}
        </Button>
      </div>
    </form>
  );
}

function EditCompanyForm({
  company,
  onSubmit,
  submitLabel,
}: CompanyFormEditProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateCompanyFormValues>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      name: company.name,
      code: company.code ?? '',
      description: company.description ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: company.name,
      code: company.code ?? '',
      description: company.description ?? '',
    });
  }, [company, reset]);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(
          toCompanyPayload({
            name: values.name,
            code: values.code,
            description: values.description,
          }),
        );
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="edit-company-name">Nom</Label>
        <Input
          id="edit-company-name"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-company-code">Code (optionnel)</Label>
        <Input
          id="edit-company-code"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.code)}
          {...register('code')}
        />
        {errors.code ? (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-company-description">
          Description (optionnelle)
        </Label>
        <Textarea
          id="edit-company-description"
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
