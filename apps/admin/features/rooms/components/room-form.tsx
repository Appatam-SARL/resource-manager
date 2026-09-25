'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MeetingRoom } from '@resource-manager/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompaniesOptions } from '@/hooks/use-companies-options';
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
};

export function RoomForm({
  initial,
  onSubmit,
  submitLabel = 'Enregistrer',
  loading = false,
}: RoomFormProps) {
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const companiesQuery = useCompaniesOptions(isGroupAdmin);
  const isEdit = Boolean(initial);

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      companyId: initial?.companyId ?? user?.companyId ?? '',
      name: initial?.name ?? '',
      location: initial?.location ?? '',
      capacity: initial?.capacity ?? 10,
      description: initial?.description ?? '',
    },
  });

  useEffect(() => {
    if (!isGroupAdmin && user?.companyId) {
      form.setValue('companyId', user.companyId);
    }
  }, [isGroupAdmin, user?.companyId, form]);

  return (
    <form
      className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-border/60"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          ...values,
          location: values.location || undefined,
          description: values.description || undefined,
        });
      })}
    >
      {isGroupAdmin && !isEdit ? (
        <div className="space-y-1.5">
          <Label>Entreprise</Label>
          <Controller
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => field.onChange(value ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {(companiesQuery.data ?? []).map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.companyId ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.companyId.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" {...form.register('name')} />
          {form.formState.errors.name ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Localisation</Label>
          <Input id="location" {...form.register('location')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity">Capacité</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            {...form.register('capacity', { valueAsNumber: true })}
          />
          {form.formState.errors.capacity ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.capacity.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...form.register('description')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
