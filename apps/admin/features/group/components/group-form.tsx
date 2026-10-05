'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { Group } from '@resource-manager/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateGroup } from '@/features/group/hooks/use-group';

const groupSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(120, 'Le nom ne peut pas dépasser 120 caractères'),
});

type GroupFormValues = z.infer<typeof groupSchema>;

type GroupFormProps = {
  group: Group;
  canEdit: boolean;
};

export function GroupForm({ group, canEdit }: GroupFormProps) {
  const updateGroup = useUpdateGroup();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: group.name },
  });

  useEffect(() => {
    reset({ name: group.name });
  }, [group.name, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateGroup.mutateAsync({ id: group.id, name: values.name });
      toast.success('Groupe mis à jour');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur inattendue');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">Nom du groupe</Label>
        <Input
          id="group-name"
          disabled={!canEdit || isSubmitting}
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        ) : null}
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
