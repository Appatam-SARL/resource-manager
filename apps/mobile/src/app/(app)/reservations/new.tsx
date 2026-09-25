import { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ResourceType } from '@resource-manager/types';
import {
  useCheckAvailabilityMutation,
  useCreateReservation,
} from '@/features/reservations/hooks/use-reservations';
import { useVehicles, useVehicle } from '@/features/vehicles/hooks/use-vehicles';
import { useRooms, useRoom } from '@/features/rooms/hooks/use-rooms';
import {
  vehicleReservationSchema,
  validatePassengerCountAgainstSeats,
  type VehicleReservationFormValues,
} from '@/schemas/vehicle-reservation-schema';
import {
  roomReservationSchema,
  validateParticipantCountAgainstCapacity,
  type RoomReservationFormValues,
} from '@/schemas/room-reservation-schema';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { combineDateAndTime } from '@/lib/format';
import { AppError } from '@/lib/errors';
import { colors, spacing } from '@/constants/theme';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewReservationScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    vehicleId?: string;
    roomId?: string;
  }>();

  const initialType: ResourceType = params.type === 'ROOM' || params.type === 'VEHICLE'
    ? params.type
    : params.roomId
      ? 'ROOM'
      : 'VEHICLE';

  const [resourceType, setResourceType] = useState<ResourceType>(initialType);
  const createMutation = useCreateReservation();
  const availabilityMutation = useCheckAvailabilityMutation();

  const vehiclesQuery = useVehicles({ page: 1, limit: 50, status: 'AVAILABLE' });
  const roomsQuery = useRooms({ page: 1, limit: 50, status: 'AVAILABLE' });

  const vehicleForm = useForm<VehicleReservationFormValues>({
    resolver: zodResolver(vehicleReservationSchema),
    defaultValues: {
      vehicleId: params.vehicleId ?? '',
      startDate: todayStr(),
      startTime: '09:00',
      endDate: todayStr(),
      endTime: '12:00',
      destination: '',
      missionReason: '',
      passengerCount: 1,
      comment: '',
    },
  });

  const roomForm = useForm<RoomReservationFormValues>({
    resolver: zodResolver(roomReservationSchema),
    defaultValues: {
      roomId: params.roomId ?? '',
      startDate: todayStr(),
      startTime: '09:00',
      endDate: todayStr(),
      endTime: '10:00',
      meetingSubject: '',
      participantCount: 1,
      comment: '',
    },
  });

  const selectedVehicleId = useWatch({ control: vehicleForm.control, name: 'vehicleId' });
  const selectedRoomId = useWatch({ control: roomForm.control, name: 'roomId' });
  const vehicleDetail = useVehicle(selectedVehicleId || undefined);
  const roomDetail = useRoom(selectedRoomId || undefined);

  const vehicleOptions = useMemo(
    () => vehiclesQuery.data?.data ?? [],
    [vehiclesQuery.data],
  );
  const roomOptions = useMemo(() => roomsQuery.data?.data ?? [], [roomsQuery.data]);

  const submitVehicle = vehicleForm.handleSubmit(async (values) => {
    const seats = vehicleDetail.data?.seats;
    if (seats != null) {
      const seatsError = validatePassengerCountAgainstSeats(
        values.passengerCount,
        seats,
      );
      if (seatsError) {
        vehicleForm.setError('passengerCount', { message: seatsError });
        return;
      }
    }

    const startAt = combineDateAndTime(values.startDate, values.startTime);
    const endAt = combineDateAndTime(values.endDate, values.endTime);

    try {
      const availability = await availabilityMutation.mutateAsync({
        resourceType: 'VEHICLE',
        resourceId: values.vehicleId,
        startAt,
        endAt,
      });
      if (!availability.available) {
        Alert.alert(
          'Indisponible',
          'Ce véhicule n’est pas disponible sur la période sélectionnée.',
        );
        return;
      }

      const reservation = await createMutation.mutateAsync({
        resourceType: 'VEHICLE',
        vehicleId: values.vehicleId,
        startAt,
        endAt,
        destination: values.destination,
        missionReason: values.missionReason,
        passengerCount: values.passengerCount,
        comment: values.comment || undefined,
      });

      Alert.alert('Réservation créée', 'Votre demande a été enregistrée.');
      router.replace(`/(app)/reservations/${reservation.id}`);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof AppError
          ? error.message
          : 'Impossible de créer la réservation.',
      );
    }
  });

  const submitRoom = roomForm.handleSubmit(async (values) => {
    const capacity = roomDetail.data?.capacity;
    if (capacity != null) {
      const capError = validateParticipantCountAgainstCapacity(
        values.participantCount,
        capacity,
      );
      if (capError) {
        roomForm.setError('participantCount', { message: capError });
        return;
      }
    }

    const startAt = combineDateAndTime(values.startDate, values.startTime);
    const endAt = combineDateAndTime(values.endDate, values.endTime);

    try {
      const availability = await availabilityMutation.mutateAsync({
        resourceType: 'ROOM',
        resourceId: values.roomId,
        startAt,
        endAt,
      });
      if (!availability.available) {
        Alert.alert(
          'Indisponible',
          'Cette salle n’est pas disponible sur la période sélectionnée.',
        );
        return;
      }

      const reservation = await createMutation.mutateAsync({
        resourceType: 'ROOM',
        roomId: values.roomId,
        startAt,
        endAt,
        meetingSubject: values.meetingSubject,
        participantCount: values.participantCount,
        comment: values.comment || undefined,
      });

      Alert.alert('Réservation créée', 'Votre demande a été enregistrée.');
      router.replace(`/(app)/reservations/${reservation.id}`);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof AppError
          ? error.message
          : 'Impossible de créer la réservation.',
      );
    }
  });

  const busy = createMutation.isPending || availabilityMutation.isPending;

  return (
    <Screen scroll keyboard>
      <Text style={styles.title}>Nouvelle réservation</Text>

      <View style={styles.chips}>
        <Chip
          label="Véhicule"
          active={resourceType === 'VEHICLE'}
          onPress={() => setResourceType('VEHICLE')}
        />
        <Chip
          label="Salle"
          active={resourceType === 'ROOM'}
          onPress={() => setResourceType('ROOM')}
        />
      </View>

      {resourceType === 'VEHICLE' ? (
        <View style={styles.form}>
          <Text style={styles.section}>Véhicule</Text>
          <View style={styles.options}>
            {vehicleOptions.map((v) => (
              <Card
                key={v.id}
                style={[
                  styles.option,
                  selectedVehicleId === v.id && styles.optionSelected,
                ]}
                onPress={() => vehicleForm.setValue('vehicleId', v.id)}
                accessibilityLabel={`${v.brand} ${v.model}`}
              >
                <Text style={styles.optionTitle}>
                  {v.brand} {v.model}
                </Text>
                <Text style={styles.optionMeta}>
                  {v.registrationNumber} · {v.seats} places
                </Text>
              </Card>
            ))}
          </View>
          {vehicleForm.formState.errors.vehicleId ? (
            <Text style={styles.error}>
              {vehicleForm.formState.errors.vehicleId.message}
            </Text>
          ) : null}

          <Controller
            control={vehicleForm.control}
            name="startDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date de départ (AAAA-MM-JJ)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={vehicleForm.formState.errors.startDate?.message}
                accessibilityLabel="Date de départ"
              />
            )}
          />
          <Controller
            control={vehicleForm.control}
            name="startTime"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Heure de départ (HH:mm)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={vehicleForm.formState.errors.startTime?.message}
                accessibilityLabel="Heure de départ"
              />
            )}
          />
          <Controller
            control={vehicleForm.control}
            name="endDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date de retour (AAAA-MM-JJ)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={vehicleForm.formState.errors.endDate?.message}
                accessibilityLabel="Date de retour"
              />
            )}
          />
          <Controller
            control={vehicleForm.control}
            name="endTime"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Heure de retour (HH:mm)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={vehicleForm.formState.errors.endTime?.message}
                accessibilityLabel="Heure de retour"
              />
            )}
          />
          <Controller
            control={vehicleForm.control}
            name="destination"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Destination"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={vehicleForm.formState.errors.destination?.message}
                accessibilityLabel="Destination"
              />
            )}
          />
          <Controller
            control={vehicleForm.control}
            name="missionReason"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Motif de la mission"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={vehicleForm.formState.errors.missionReason?.message}
                accessibilityLabel="Motif de la mission"
              />
            )}
          />
          <Controller
            control={vehicleForm.control}
            name="passengerCount"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nombre de passagers"
                keyboardType="number-pad"
                value={String(value ?? '')}
                onBlur={onBlur}
                onChangeText={(t) => onChange(t === '' ? 0 : Number(t))}
                error={vehicleForm.formState.errors.passengerCount?.message}
                accessibilityLabel="Nombre de passagers"
              />
            )}
          />
          <Controller
            control={vehicleForm.control}
            name="comment"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextArea
                label="Commentaire (optionnel)"
                value={value ?? ''}
                onBlur={onBlur}
                onChangeText={onChange}
                accessibilityLabel="Commentaire"
              />
            )}
          />
          <Button
            title="Vérifier et réserver"
            onPress={submitVehicle}
            loading={busy}
            accessibilityLabel="Vérifier et réserver le véhicule"
          />
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.section}>Salle</Text>
          <View style={styles.options}>
            {roomOptions.map((r) => (
              <Card
                key={r.id}
                style={[
                  styles.option,
                  selectedRoomId === r.id && styles.optionSelected,
                ]}
                onPress={() => roomForm.setValue('roomId', r.id)}
                accessibilityLabel={r.name}
              >
                <Text style={styles.optionTitle}>{r.name}</Text>
                <Text style={styles.optionMeta}>
                  {r.location ?? 'Sans lieu'} · {r.capacity} places
                </Text>
              </Card>
            ))}
          </View>
          {roomForm.formState.errors.roomId ? (
            <Text style={styles.error}>{roomForm.formState.errors.roomId.message}</Text>
          ) : null}

          <Controller
            control={roomForm.control}
            name="startDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date (AAAA-MM-JJ)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={roomForm.formState.errors.startDate?.message}
                accessibilityLabel="Date"
              />
            )}
          />
          <Controller
            control={roomForm.control}
            name="startTime"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Heure de début (HH:mm)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={roomForm.formState.errors.startTime?.message}
                accessibilityLabel="Heure de début"
              />
            )}
          />
          <Controller
            control={roomForm.control}
            name="endDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date de fin (AAAA-MM-JJ)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={roomForm.formState.errors.endDate?.message}
                accessibilityLabel="Date de fin"
              />
            )}
          />
          <Controller
            control={roomForm.control}
            name="endTime"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Heure de fin (HH:mm)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={roomForm.formState.errors.endTime?.message}
                accessibilityLabel="Heure de fin"
              />
            )}
          />
          <Controller
            control={roomForm.control}
            name="meetingSubject"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Objet de la réunion"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={roomForm.formState.errors.meetingSubject?.message}
                accessibilityLabel="Objet de la réunion"
              />
            )}
          />
          <Controller
            control={roomForm.control}
            name="participantCount"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nombre de participants"
                keyboardType="number-pad"
                value={String(value ?? '')}
                onBlur={onBlur}
                onChangeText={(t) => onChange(t === '' ? 0 : Number(t))}
                error={roomForm.formState.errors.participantCount?.message}
                accessibilityLabel="Nombre de participants"
              />
            )}
          />
          <Controller
            control={roomForm.control}
            name="comment"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextArea
                label="Commentaire (optionnel)"
                value={value ?? ''}
                onBlur={onBlur}
                onChangeText={onChange}
                accessibilityLabel="Commentaire"
              />
            )}
          />
          <Button
            title="Vérifier et réserver"
            onPress={submitRoom}
            loading={busy}
            accessibilityLabel="Vérifier et réserver la salle"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    paddingVertical: spacing.md,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  optionMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
