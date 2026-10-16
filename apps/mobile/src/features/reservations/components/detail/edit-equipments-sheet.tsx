import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Reservation } from '@resource-manager/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import {
  useClampEquipmentSelection,
  useEquipmentAvailability,
  useReplaceReservationEquipments,
} from '@/features/reservations/hooks/use-equipments';
import {
  getEquipmentUpdateErrorMessage,
  isSameSelection,
  selectionFromReservation,
  toEquipmentPayload,
  type EquipmentSelection,
} from '@/features/reservations/lib/equipment-selection';
import { colors, spacing } from '@/constants/theme';
import { EquipmentErrorNotice, EquipmentPicker } from '../equipment-picker';

type EditEquipmentsSheetProps = {
  reservation: Reservation;
  onClose: () => void;
  onUpdated: (reservation: Reservation) => void;
};

/** Render conditionally so the selection resets each time the sheet opens. */
export function EditEquipmentsSheet({ reservation, onClose, onUpdated }: EditEquipmentsSheetProps) {
  const [initialSelection] = useState(() => selectionFromReservation(reservation.equipments));
  const [selection, setSelection] = useState<EquipmentSelection>(initialSelection);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const replaceMutation = useReplaceReservationEquipments();

  const availability = useEquipmentAvailability({
    resourceType: reservation.resourceType,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    excludeReservationId: reservation.id,
    enabled: true,
  });
  const knownNames = Object.fromEntries(
    (reservation.equipments ?? []).map((item) => [item.equipment.id, item.equipment.name]),
  );
  useClampEquipmentSelection(availability.data, selection, setSelection, knownNames);

  const unchanged = isSameSelection(selection, initialSelection);

  const changeSelection = (next: EquipmentSelection) => {
    setSelection(next);
    setSubmitError(null);
  };

  const submit = async () => {
    setSubmitError(null);
    try {
      const updated = await replaceMutation.mutateAsync({
        id: reservation.id,
        equipments: toEquipmentPayload(selection),
      });
      onUpdated(updated);
    } catch (error) {
      setSubmitError(getEquipmentUpdateErrorMessage(error));
      void availability.refetch();
    }
  };

  return (
    <BottomSheet visible title="Modifier les équipements" onClose={onClose}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          {reservation.status === 'APPROVED'
            ? 'Votre réservation reste approuvée ; les responsables seront informés de la modification.'
            : 'Ajustez les équipements demandés pour ce créneau.'}
        </Text>
        <EquipmentPicker
          items={availability.data}
          selection={selection}
          onChange={changeSelection}
          isLoading={availability.isLoading}
          isError={availability.isError}
          onRetry={() => void availability.refetch()}
        />
        {submitError ? (
          <View style={styles.error}>
            <EquipmentErrorNotice message={submitError} />
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.actions}>
        <Button
          title="Enregistrer les équipements"
          onPress={() => void submit()}
          loading={replaceMutation.isPending}
          disabled={unchanged || replaceMutation.isPending}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  error: {
    marginTop: spacing.md,
  },
  actions: {
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
