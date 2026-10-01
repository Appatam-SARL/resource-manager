import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ResourceType } from '@resource-manager/types';
import { ReservationHeader } from '@/features/reservations/components/reservation-header';
import { ReservationSuccess } from '@/features/reservations/components/reservation-success';
import { VehicleReservationForm } from '@/features/reservations/components/vehicle/vehicle-reservation-form';
import { RoomReservationForm } from '@/features/reservations/components/room/room-reservation-form';
import type { ReservationSuccessData } from '@/features/reservations/hooks/use-reservation-submission';
import { colors } from '@/constants/theme';

export default function NewReservationScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    vehicleId?: string;
    roomId?: string;
  }>();

  const initialType: ResourceType =
    params.type === 'ROOM' || params.type === 'VEHICLE'
      ? params.type
      : params.roomId
        ? 'ROOM'
        : 'VEHICLE';

  const [resourceType, setResourceType] = useState<ResourceType>(initialType);
  const [mounted, setMounted] = useState<Record<ResourceType, boolean>>({
    VEHICLE: initialType === 'VEHICLE',
    ROOM: initialType === 'ROOM',
  });
  const [success, setSuccess] = useState<ReservationSuccessData | null>(null);

  const changeType = (type: ResourceType) => {
    setResourceType(type);
    setMounted((current) => ({ ...current, [type]: true }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ReservationHeader
        resourceType={resourceType}
        onTypeChange={success ? undefined : changeType}
      />

      {success ? (
        <ReservationSuccess
          status={success.reservation.status}
          resourceName={success.resourceName}
          scheduleLabel={success.scheduleLabel}
          onViewReservation={() => router.replace(`/(app)/reservations/${success.reservation.id}`)}
          onBackToList={() => router.replace('/(app)/reservations')}
        />
      ) : (
        <>
          {mounted.VEHICLE ? (
            <View style={[styles.fill, resourceType !== 'VEHICLE' && styles.hidden]}>
              <VehicleReservationForm initialVehicleId={params.vehicleId} onSuccess={setSuccess} />
            </View>
          ) : null}
          {mounted.ROOM ? (
            <View style={[styles.fill, resourceType !== 'ROOM' && styles.hidden]}>
              <RoomReservationForm initialRoomId={params.roomId} onSuccess={setSuccess} />
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
