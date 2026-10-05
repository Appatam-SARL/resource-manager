import { useState } from 'react';
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, DoorOpen, MessageSquare, Presentation, Users } from 'lucide-react-native';
import type { MeetingRoom } from '@resource-manager/types';
import { useRoom, useRooms } from '@/features/rooms/hooks/use-rooms';
import {
  roomReservationSchema,
  validateParticipantCountAgainstCapacity,
  type RoomReservationFormValues,
} from '@/schemas/room-reservation-schema';
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

const DEFAULT_DURATION_MINUTES = 60;

type Section = 'resource' | 'schedule' | 'availability' | 'details';

function toRoomCard(room: MeetingRoom): ResourceCardData {
  return {
    id: room.id,
    title: room.name,
    subtitle: [room.location, room.company?.name].filter(Boolean).join(' · ') || null,
    capacityLabel: pluralize(room.capacity, 'personne', 'personnes'),
    statusLabel: RESOURCE_STATUS_LABELS[room.status],
    statusColor: statusColor(room.status),
  };
}

function sectionForErrors(errors: FieldErrors<RoomReservationFormValues>): Section {
  if (errors.roomId) return 'resource';
  if (errors.startDate || errors.startTime || errors.endDate || errors.endTime) return 'schedule';
  return 'details';
}

type RoomReservationFormProps = {
  initialRoomId?: string;
  onSuccess: (result: ReservationSuccessData) => void;
};

export function RoomReservationForm({ initialRoomId, onSuccess }: RoomReservationFormProps) {
  const now = useNow();
  const [defaultSchedule] = useState(() => getDefaultSchedule(new Date(), DEFAULT_DURATION_MINUTES));
  const { scrollRef, register, scrollTo } = useSectionScroll<Section>();
  const { submit, submitError, clearSubmitError, isSubmitting } = useReservationSubmission();

  const { control, handleSubmit, setValue, setError, formState } = useForm<RoomReservationFormValues>({
    resolver: zodResolver(roomReservationSchema),
    mode: 'onTouched',
    defaultValues: {
      roomId: initialRoomId ?? '',
      ...defaultSchedule,
      meetingSubject: '',
      participantCount: 1,
      comment: '',
    },
  });
  const values = useWatch({ control });
  const roomId = values.roomId ?? '';
  const schedule: Schedule = {
    startDate: values.startDate ?? defaultSchedule.startDate,
    startTime: values.startTime ?? defaultSchedule.startTime,
    endDate: values.endDate ?? defaultSchedule.endDate,
    endTime: values.endTime ?? defaultSchedule.endTime,
  };

  const roomsQuery = useRooms({ page: 1, limit: 100, status: 'AVAILABLE', scope: 'group' });
  const listed = roomsQuery.data?.data ?? [];
  const listedRoom = listed.find((r) => r.id === roomId);
  const detailQuery = useRoom(roomId && !listedRoom && roomsQuery.isSuccess ? roomId : undefined);
  const selectedRoom = listedRoom ?? detailQuery.data;
  const rooms = selectedRoom && !listedRoom ? [selectedRoom, ...listed] : listed;
  const bookable = selectedRoom ? selectedRoom.status === 'AVAILABLE' : true;

  const scheduleIssue = getScheduleIssue(schedule, now);
  const availability = useSlotAvailability({
    resourceType: 'ROOM',
    resourceId: roomId,
    schedule,
    enabled: !scheduleIssue && bookable,
  });
  const availabilityState = getAvailabilityState({
    hasResource: Boolean(roomId),
    resourceBookable: bookable,
    scheduleValid: !scheduleIssue,
    submitConflict: submitError?.kind === 'conflict',
    isChecking: availability.isChecking,
    isError: availability.isError,
    available: availability.data?.available,
  });

  const selectRoom = (id: string) => {
    clearSubmitError();
    setValue('roomId', id, { shouldValidate: formState.isSubmitted });
  };

  const changeSchedule = (next: Schedule) => {
    clearSubmitError();
    const options = { shouldValidate: formState.isSubmitted };
    setValue('startDate', next.startDate, options);
    setValue('startTime', next.startTime, options);
    setValue('endDate', next.endDate, options);
    setValue('endTime', next.endTime, options);
  };

  const onValid = async (form: RoomReservationFormValues) => {
    if (getScheduleIssue(form, new Date())) {
      scrollTo('schedule');
      return;
    }
    if (selectedRoom) {
      const capacityError = validateParticipantCountAgainstCapacity(form.participantCount, selectedRoom.capacity);
      if (capacityError) {
        setError('participantCount', { message: capacityError });
        scrollTo('details');
        return;
      }
    }
    if (!bookable || availability.data?.available === false) {
      scrollTo('availability');
      return;
    }

    const reservation = await submit({
      resourceType: 'ROOM',
      roomId: form.roomId,
      startAt: combineDateAndTime(form.startDate, form.startTime),
      endAt: combineDateAndTime(form.endDate, form.endTime),
      meetingSubject: form.meetingSubject.trim(),
      participantCount: form.participantCount,
      comment: form.comment?.trim() || undefined,
    });
    if (reservation) {
      onSuccess({
        reservation,
        resourceName: selectedRoom
          ? [selectedRoom.name, selectedRoom.location].filter(Boolean).join(' · ')
          : 'Salle de réunion',
        scheduleLabel: formatScheduleRange(form),
      });
    } else {
      scrollTo('availability');
    }
  };

  const onSubmit = handleSubmit(onValid, (errors) => scrollTo(sectionForErrors(errors)));

  const duration = getScheduleDurationMinutes(schedule);
  const summaryItems: SummaryItem[] = [
    selectedRoom
      ? {
          key: 'room',
          icon: DoorOpen,
          label: 'Salle',
          value: selectedRoom.name,
          secondary: selectedRoom.location,
        }
      : null,
    !scheduleIssue
      ? {
          key: 'schedule',
          icon: CalendarClock,
          label: 'Horaire',
          value: formatScheduleRange(schedule),
          secondary: duration ? `Durée : ${formatDuration(duration)}` : null,
        }
      : null,
    values.meetingSubject?.trim()
      ? { key: 'subject', icon: Presentation, label: 'Objet', value: values.meetingSubject.trim() }
      : null,
    {
      key: 'participants',
      icon: Users,
      label: 'Participants',
      value: pluralize(values.participantCount ?? 1, 'participant', 'participants'),
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
          recap={selectedRoom && !scheduleIssue ? `${selectedRoom.name} · ${formatScheduleRange(schedule)}` : null}
          error={submitError?.kind === 'general' ? submitError.message : null}
        />
      }
    >
      <FormSection step={1} title="Salle" description="Choisissez la salle de votre réunion" onLayout={register('resource')}>
        <ResourceSelector
          items={rooms.map(toRoomCard)}
          icon={DoorOpen}
          selectedId={roomId}
          slotAvailability={
            availabilityState === 'available'
              ? 'available'
              : availabilityState === 'unavailable' || availabilityState === 'conflict'
                ? 'unavailable'
                : null
          }
          onSelect={selectRoom}
          isLoading={roomsQuery.isPending}
          isError={roomsQuery.isError}
          onRetry={() => void roomsQuery.refetch()}
          emptyTitle="Aucune salle disponible"
          emptyMessage="Aucune salle du Groupe n’est actuellement ouverte à la réservation."
          error={formState.errors.roomId?.message}
        />
      </FormSection>

      <FormSection step={2} title="Quand ?" description="Date et horaires de la réunion" onLayout={register('schedule')}>
        <ScheduleSection
          mode="single-day"
          schedule={schedule}
          onChange={changeSchedule}
          defaultDurationMinutes={DEFAULT_DURATION_MINUTES}
          error={scheduleIssue ? SCHEDULE_ISSUE_MESSAGES[scheduleIssue] : undefined}
        />
      </FormSection>

      <FormSection step={3} title="Disponibilité" onLayout={register('availability')}>
        <AvailabilityIndicator
          state={availabilityState}
          resourceLabel="Salle"
          feminine
          conflicts={availability.data?.conflicts ?? []}
          notBookableReason={
            selectedRoom && !bookable
              ? `Statut actuel : ${RESOURCE_STATUS_LABELS[selectedRoom.status]}. Choisissez une autre salle.`
              : undefined
          }
          onRetry={() => void availability.refetch()}
          onChangeSchedule={() => scrollTo('schedule')}
        />
      </FormSection>

      <FormSection step={4} title="Votre réunion" onLayout={register('details')}>
        <Controller
          control={control}
          name="meetingSubject"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Objet de la réunion"
              icon={Presentation}
              placeholder="Ex. Réunion équipe commerciale"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={200}
              error={formState.errors.meetingSubject?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="participantCount"
          render={({ field: { onChange, value } }) => (
            <CountStepper
              label="Nombre de participants"
              value={value}
              onChange={onChange}
              unit={{ singular: 'participant', plural: 'participants' }}
              max={selectedRoom?.capacity}
              capacityLabel={
                selectedRoom
                  ? `Capacité de la salle : ${pluralize(selectedRoom.capacity, 'personne', 'personnes')}`
                  : undefined
              }
              missingCapacityHint="Sélectionnez une salle pour connaître sa capacité."
              error={formState.errors.participantCount?.message}
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
              placeholder="Besoin particulier, configuration, matériel..."
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
          emptyMessage="Sélectionnez une salle et un créneau."
          footnote="Votre demande sera transmise pour validation. Vous serez notifié de la décision."
        />
      </FormSection>
    </ReservationFormShell>
  );
}
