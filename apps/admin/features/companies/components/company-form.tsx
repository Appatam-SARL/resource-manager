'use client';

import Link from 'next/link';
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Company } from '@resource-manager/types';
import { FormField } from '@/components/forms/form-field';
import { FormActions, FormCard, FormSection } from '@/components/forms/form-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  updateCompanySchema,
  toCompanyPayload,
  type UpdateCompanyFormValues,
} from '@/features/companies/schemas/company-schema';

type CompanyFormCreateProps = {
  mode: 'create';
  groupId: string;
  groupName?: string;
  onSubmit: (values: ReturnType<typeof toCompanyPayload>) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
};

type CompanyFormEditProps = {
  mode: 'edit';
  company: Company;
  onSubmit: (values: ReturnType<typeof toCompanyPayload>) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
};

type CompanyFormProps = CompanyFormCreateProps | CompanyFormEditProps;

const EMPTY_VALUES: UpdateCompanyFormValues = { name: '', code: '', description: '' };

function valuesFromCompany(company: Company): UpdateCompanyFormValues {
  return { name: company.name, code: company.code ?? '', description: company.description ?? '' };
}

export function CompanyForm(props: CompanyFormProps) {
  const isCreate = props.mode === 'create';
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateCompanyFormValues>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: isCreate ? EMPTY_VALUES : valuesFromCompany(props.company),
  });

  return (
    <FormCard>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          try {
            await props.onSubmit(toCompanyPayload(isCreate ? { ...values, groupId: props.groupId } : values));
            if (!isCreate) reset(values);
          } catch {
            // The page reports the error; keep the user's input.
          }
        })}
      >
        {isCreate && props.groupName ? (
          <FormSection title="Rattachement" description="Toute entreprise appartient au groupe.">
            <FormField label="Groupe" wide>
              <div className="flex h-9 items-center rounded-lg bg-muted/60 px-3 text-sm text-foreground ring-1 ring-border">
                {props.groupName}
              </div>
            </FormField>
          </FormSection>
        ) : null}

        <CompanyIdentityFields register={register} errors={errors} disabled={isSubmitting} idPrefix={props.mode} />

        <FormActions>
          {props.cancelHref ? (
            <Link href={props.cancelHref} className={buttonVariants({ variant: 'outline' })}>
              Annuler
            </Link>
          ) : null}
          <Button type="submit" disabled={isSubmitting || (!isCreate && !isDirty)}>
            {isSubmitting
              ? 'Enregistrement…'
              : (props.submitLabel ?? (isCreate ? 'Créer l’entreprise' : 'Enregistrer les modifications'))}
          </Button>
        </FormActions>
      </form>
    </FormCard>
  );
}

function CompanyIdentityFields({
  register,
  errors,
  disabled,
  idPrefix,
}: {
  register: UseFormRegister<UpdateCompanyFormValues>;
  errors: FieldErrors<UpdateCompanyFormValues>;
  disabled: boolean;
  idPrefix: string;
}) {
  return (
    <>
      <FormSection title="Identification" description="Nom affiché dans toute l’application et code interne éventuel.">
        <FormField label="Nom" htmlFor={`${idPrefix}-company-name`} error={errors.name?.message} required>
          <Input id={`${idPrefix}-company-name`} disabled={disabled} aria-invalid={Boolean(errors.name)} {...register('name')} />
        </FormField>
        <FormField label="Code" htmlFor={`${idPrefix}-company-code`} error={errors.code?.message} hint="Optionnel, 32 caractères maximum.">
          <Input
            id={`${idPrefix}-company-code`}
            className="font-mono"
            disabled={disabled}
            aria-invalid={Boolean(errors.code)}
            {...register('code')}
          />
        </FormField>
      </FormSection>

      <FormSection title="Présentation" description="Activité ou périmètre de l’entreprise au sein du groupe.">
        <FormField label="Description" htmlFor={`${idPrefix}-company-description`} error={errors.description?.message} hint="Optionnelle, 500 caractères maximum." wide>
          <Textarea
            id={`${idPrefix}-company-description`}
            rows={4}
            disabled={disabled}
            aria-invalid={Boolean(errors.description)}
            {...register('description')}
          />
        </FormField>
      </FormSection>
    </>
  );
}
