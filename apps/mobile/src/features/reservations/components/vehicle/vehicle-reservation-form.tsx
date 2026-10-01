import { useState } from 'react';
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Car, FileText, MapPin, MessageSquare, Target, Users } from 'lucide-react-native';
import type { Vehicle } from '@resource-manager/types';
import { useVehicle, useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import {
  validatePassengerCountAgainstSeats,
  vehicleReservationSchema,
  type VehicleReservationFormValues,
} from '@/schemas/vehicle-reservation-schema';
import { combineDateAndTime } from '@/lib/format';
import { useNow } from '@/hooks/use-now';
import { RESOURCE_STATUS_LABELS, statusColor } from '@/constants/theme';
import { getAvailabilityState } from '@/features/reservations/lib/availability';
import {
  formatDuration,
  formatScheduleRange,
  getDefaultSchedule,
  getScheduleDurationMinutes,
  getScheduleIssue,
  pluralize,
  SCHEDULE_ISSUE_MESSAGES,
  type Schedule,
} from '@/features/reservations/lib/schedule';
import { useSlotAvailability } from '@/features/reservations/hooks/use-slot-availability';
import {
  useReservationSubmission,
  type ReservationSuccessData,
} from '@/features/reservations/hooks/use-reservation-submission';
import { useSectionScroll } from '@/features/reservations/hooks/use-section-scroll';
import { ReservationFormShell } from '../reservation-form-shell';
import { FormSection } from '../form-section';
import { ResourceSelector, type ResourceCardData } from '../resource-selector';
import { ScheduleSection } from '../schedule-section';
import { AvailabilityIndicator } from '../availability-indicator';
import { FormField } from '../form-field';
import { CountStepper } from '../count-stepper';
import { ReservationSummary, type SummaryItem } from '../reservation-summary';
import { ReservationBottomBar } from '../reservation-bottom-bar';

const DEFAULT_DURATION_MINUTES = 180;

type Section = 'resource' | 'schedule' | 'availability' | 'details';

function toVehicleCard(vehicle: Vehicle): ResourceCardData {
  return {
    id: vehicle.id,
    title: `${vehicle.brand} ${vehicle.model}`,
    subtitle: vehicle.registrationNumber,
    capacityLabel: pluralize(vehicle.seats, 'place', 'places'),
    statusLabel: RESOURCE_STATUS_LABELS[vehicle.status],
    statusColor: statusColor(vehicle.status),
  };
}

function sectionForErrors(errors: FieldErrors<VehicleReservationFormValues>): Section {
  if (errors.vehicleId) return 'resource';
  if (errors.startDate || errors.startTime || errors.endDate || errors.endTime) return 'schedule';
  return 'details';
}

type VehicleReservationFormProps = {
  initialVehicleId?: string;
  onSuccess: (result: ReservationSuccessData) => void;
};

export function VehicleReservationForm({ initialVehicleId, onSuccess }: VehicleReservationFormProps) {
  const now = useNow();
  const [defaultSchedule] = useState(() => getDefaultSchedule(new Date(), DEFAULT_DURATION_MINUTES));
  const { scrollRef, register, scrollTo } = useSectionScroll<Section>();
  const { submit, submitError, clearSubmitError, isSubmitting } = useReservationSubmission();

  const { control, handleSubmit, setValue, setError, formState } = useForm<VehicleReservationFormValues>({
    resolver: zodResolver(vehicleReservationSchema),
    mode: 'onTouched',
    defaultValues: {
      vehicleId: initialVehicleId ?? '',
      ...defaultSchedule,
      destination: '',
      missionReason: '',
      passengerCount: 1,
      comment: '',
    },
  });
  const values = useWatch({ control });
  const vehicleId = values.vehicleId ?? '';
  const schedule: Schedule = {
    startDate: values.startDate ?? defaultSchedule.startDate,
    startTime: values.startTime ?? defaultSchedule.startTime,
    endDate: values.endDate ?? defaultSchedule.endDate,
    endTime: values.endTime ?? defaultSchedule.endTime,
  };

  const vehiclesQuery = useVehicles({ page: 1, limit: 50, status: 'AVAILABLE' });
  const listed = vehiclesQuery.data?.data ?? [];
  const listedVehicle = listed.find((v) => v.id === vehicleId);
  const detailQuery = useVehicle(vehicleId && !listedVehicle && vehiclesQuery.isSuccess ? vehicleId : undefined);
  const selectedVehicle = listedVehicle ?? detailQuery.data;
  const vehicles = selectedVehicle && !listedVehicle ? [selectedVehicle, ...listed] : listed;
  const bookable = selectedVehicle ? selectedVehicle.status === 'AVAILABLE' : true;

  const scheduleIssue = getScheduleIssue(schedule, now);
  const availability = useSlotAvailability({
    resourceType: 'VEHICLE',
    resourceId: vehicleId,
    schedule,
    enabled: !scheduleIssue && bookable,
  });
  const availabilityState = getAvailabilityState({
    hasResource: Boolean(vehicleId),
    resourceBookable: bookable,
    scheduleValid: !scheduleIssue,
    submitConflict: submitError?.kind === 'conflict',
    isChecking: availability.isChecking,
    isError: availability.isError,
    available: availability.data?.available,
  });

  const selectVehicle = (id: string) => {
    clearSubmitError();
    setValue('vehicleId', id, { shouldValidate: formState.isSubmitted });
  };

  const changeSchedule = (next: Schedule) => {
    clearSubmitError();
    const options = { shouldValidate: formState.isSubmitted };
    setValue('startDate', next.startDate, options);
    setValue('startTime', next.startTime, options);
    setValue('endDate', next.endDate, options);
    setValue('endTime', next.endTime, options);
  };

  const onValid = async (form: VehicleReservationFormValues) => {
    if (getScheduleIssue(form, new Date())) {
      scrollTo('schedule');
      return;
    }
    if (selectedVehicle) {
      const seatsError = validatePassengerCountAgainstSeats(form.passengerCount, selectedVehicle.seats);
      if (seatsError) {
        setError('passengerCount', { message: seatsError });
        scrollTo('details');
        return;
      }
    }
    if (!bookable || availability.data?.available === false) {
      scrollTo('availability');
      return;
    }

    const reservation = await submit({
      resourceType: 'VEHICLE',
      vehicleId: form.vehicleId,
      startAt: combineDateAndTime(form.startDate, form.startTime),
      endAt: combineDateAndTime(form.endDate, form.endTime),
      destination: form.destination.trim(),
      missionReason: form.missionReason.trim(),
      passengerCount: form.passengerCount,
      comment: form.comment?.trim() || undefined,
    });
    if (reservation) {
      onSuccess({
        reservation,
        resourceName: selectedVehicle
          ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${selectedVehicle.registrationNumber}`
          : 'Véhicule',
        scheduleLabel: formatScheduleRange(form),
      });
    } else {
      scrollTo('availability');
    }
  };

  const onSubmit = handleSubmit(onValid, (errors) => scrollTo(sectionForErrors(errors)));

  const duration = getScheduleDurationMinutes(schedule);
  const summaryItems: SummaryItem[] = [
    selectedVehicle
      ? {
          key: 'vehicle',
          icon: Car,
          label: 'Véhicule',
          value: `${selectedVehicle.brand} ${selectedVehicle.model}`,
          secondary: selectedVehicle.registrationNumber,
        }
      : null,
    !scheduleIssue
      ? {
          key: 'schedule',
          icon: CalendarClock,
          label: 'Période',
          value: formatScheduleRange(schedule),
          secondary: duration ? `Durée : ${formatDuration(duration)}` : null,
        }
      : null,
    values.destination?.trim()
      ? { key: 'destination', icon: MapPin, label: 'Destination', value: values.destination.trim() }
      : null,
    values.missionReason?.trim()
      ? { key: 'reason', icon: Target, label: 'Motif', value: values.missionReason.trim() }
      : null,
    {
      key: 'passengers',
      icon: Users,
      label: 'Passagers',
      value: pluralize(values.passengerCount ?? 1, 'passager', 'passagers'),
    },
  ].filter((item): item is SummaryItem => item !== null);

  return (
    <ReservationFormShell
      scrollRef={scrollRef}
      bottomBar={
        <ReservationBottomBar
          label="Envoyer la demande"
          loading={isSubmitting}
          onPress={onSubmit}
          recap={
            selectedVehicle && !scheduleIssue
              ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${formatScheduleRange(schedule)}`
              : null
          }
          error={submitError?.kind === 'general' ? submitError.message : null}
        />
      }
    >
      <FormSection step={1} title="Véhicule" description="Choisissez le véhicule de votre déplacement" onLayout={register('resource')}>
        <ResourceSelector
          items={vehicles.map(toVehicleCard)}
          icon={Car}
          selectedId={vehicleId}
          slotAvailability={
            availabilityState === 'available'
              ? 'available'
              : availabilityState === 'unavailable' || availabilityState === 'conflict'
                ? 'unavailable'
                : null
          }
          onSelect={selectVehicle}
          isLoading={vehiclesQuery.isPending}
          isError={vehiclesQuery.isError}
          onRetry={() => void vehiclesQuery.refetch()}
          emptyTitle="Aucun véhicule disponible"
          emptyMessage="Aucun véhicule de votre entreprise n’est actuellement ouvert à la réservation."
          error={formState.errors.vehicleId?.message}
        />
      </FormSection>

      <FormSection step={2} title="Quand ?" description="Départ et retour du véhicule" onLayout={register('schedule')}>
        <ScheduleSection
          mode="multi-day"
          schedule={schedule}
          onChange={changeSchedule}
          defaultDurationMinutes={DEFAULT_DURATION_MINUTES}
          error={scheduleIssue ? SCHEDULE_ISSUE_MESSAGES[scheduleIssue] : undefined}
        />
      </FormSection>

      <FormSection step={3} title="Disponibilité" onLayout={register('availability')}>
        <AvailabilityIndicator
          state={availabilityState}
          resourceLabel="Véhicule"
          feminine={false}
          conflicts={availability.data?.conflicts ?? []}
          notBookableReason={
            selectedVehicle && !bookable
              ? `Statut actuel : ${RESOURCE_STATUS_LABELS[selectedVehicle.status]}. Choisissez un autre véhicule.`
              : undefined
          }
          onRetry={() => void availability.refetch()}
          onChangeSchedule={() => scrollTo('schedule')}
        />
      </FormSection>

      <FormSection step={4} title="Votre déplacement" onLayout={register('details')}>
        <Controller
          control={control}
          name="destination"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Destination"
              icon={MapPin}
              placeholder="Où allez-vous ?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              returnKeyType="next"
              maxLength={200}
              error={formState.errors.destination?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="missionReason"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Motif du déplacement"
              icon={FileText}
              placeholder="Ex. Visite client, réunion, mission terrain..."
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              maxLength={500}
              error={formState.errors.missionReason?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="passengerCount"
          render={({ field: { onChange, value } }) => (
            <CountStepper
              label="Nombre de passagers"
              value={value}
              onChange={onChange}
              unit={{ singular: 'passager', plural: 'passagers' }}
              max={selectedVehicle?.seats}
              capacityLabel={
                selectedVehicle ? `Capacité : ${pluralize(selectedVehicle.seats, 'place', 'places')}` : undefined
              }
              missingCapacityHint="Sélectionnez un véhicule pour connaître sa capacité."
              showRemaining
              error={formState.errors.passengerCount?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="comment"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Commentaire"
              optional
              icon={MessageSquare}
              placeholder="Informations utiles pour le gestionnaire"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              maxLength={1000}
            />
          )}
        />
      </FormSection>

      <FormSection step={5} title="Résumé">
        <ReservationSummary
          items={summaryItems}
          emptyMessage="Sélectionnez un véhicule et un créneau."
          footnote="Votre demande sera transmise pour validation. Vous serez notifié de la décision."
        />
      </FormSection>
    </ReservationFormShell>
  );
}
