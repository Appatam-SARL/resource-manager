import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReservationStatus } from '@resource-manager/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { FilterOptionChip } from '@/features/reservations/components/list/reservation-filters';
import {
  CALENDAR_STATUSES,
  DEFAULT_CALENDAR_FILTERS,
  type CalendarFiltersValue,
} from '@/features/calendar/lib/calendar';
import { RESERVATION_STATUS_LABELS, colors, spacing } from '@/constants/theme';

const STATUS_OPTIONS: (ReservationStatus | null)[] = [null, ...CALENDAR_STATUSES];

type CalendarFilterSheetProps = {
  value: CalendarFiltersValue;
  onApply: (value: CalendarFiltersValue) => void;
  onClose: () => void;
};

/** Render conditionally: the draft is initialised from `value` when the sheet opens. */
export function CalendarFilterSheet({ value, onApply, onClose }: CalendarFilterSheetProps) {
  const [draft, setDraft] = useState(value);

  return (
    <BottomSheet visible title="Filtres" onClose={onClose}>
      <Text style={styles.groupTitle}>Statut</Text>
      <View style={styles.options}>
        {STATUS_OPTIONS.map((status) => (
          <FilterOptionChip
            key={status ?? 'all'}
            label={status ? RESERVATION_STATUS_LABELS[status] : 'Tous'}
            selected={draft.status === status}
            onPress={() => setDraft({ ...draft, status })}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        Le calendrier affiche les créneaux occupés : les demandes refusées ou annulées n’y figurent pas.
      </Text>

      <View style={styles.actions}>
        <Button
          title="Réinitialiser"
          variant="ghost"
          style={styles.button}
          onPress={() => setDraft(DEFAULT_CALENDAR_FILTERS)}
        />
        <Button title="Appliquer" style={styles.button} onPress={() => onApply(draft)} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.md,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
  },
});
