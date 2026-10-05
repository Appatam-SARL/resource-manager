import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Car, Check, DoorOpen, Layers, SlidersHorizontal, type LucideIcon } from 'lucide-react-native';
import type { ReservationStatus, ResourceType } from '@resource-manager/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { RESERVATION_STATUS_LABELS, colors, radius, spacing } from '@/constants/theme';

export type ReservationScope = 'mine' | 'scope';

export type ReservationFiltersValue = {
  resourceType: ResourceType | null;
  status: ReservationStatus | null;
  scope: ReservationScope;
};

export const DEFAULT_RESERVATION_FILTERS: ReservationFiltersValue = {
  resourceType: null,
  status: null,
  scope: 'mine',
};

const TYPE_OPTIONS: { value: ResourceType | null; label: string; icon: LucideIcon }[] = [
  { value: null, label: 'Toutes', icon: Layers },
  { value: 'VEHICLE', label: 'Véhicules', icon: Car },
  { value: 'ROOM', label: 'Salles', icon: DoorOpen },
];

const STATUS_OPTIONS: (ReservationStatus | null)[] = [
  null,
  'PENDING',
  'APPROVED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export function countSheetFilters(filters: ReservationFiltersValue): number {
  return (filters.status ? 1 : 0) + (filters.scope === 'scope' ? 1 : 0);
}

type ReservationFilterBarProps<T extends { resourceType: ResourceType | null }> = {
  value: T;
  onChange: (value: T) => void;
  onOpenSheet: () => void;
  /** Number of filters set in the sheet, shown as a badge. */
  activeSheetFilters: number;
};

export function ReservationFilterBar<T extends { resourceType: ResourceType | null }>({
  value,
  onChange,
  onOpenSheet,
  activeSheetFilters,
}: ReservationFilterBarProps<T>) {
  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {TYPE_OPTIONS.map(({ value: type, label, icon: Icon }) => {
          const selected = value.resourceType === type;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={`Filtrer : ${label}`}
              accessibilityState={{ selected }}
              onPress={() => onChange({ ...value, resourceType: type })}
              style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
            >
              <Icon size={15} color={selected ? colors.white : colors.textMuted} strokeWidth={2.25} />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          activeSheetFilters > 0 ? `Filtres, ${activeSheetFilters} actif(s)` : 'Filtres'
        }
        onPress={onOpenSheet}
        style={({ pressed }) => [
          styles.filterButton,
          activeSheetFilters > 0 && styles.filterButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <SlidersHorizontal size={18} color={activeSheetFilters > 0 ? colors.primary : colors.text} />
        {activeSheetFilters > 0 ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeSheetFilters}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

type ReservationFilterSheetProps = {
  value: ReservationFiltersValue;
  canChangeScope: boolean;
  onApply: (value: ReservationFiltersValue) => void;
  onClose: () => void;
};

/** Render conditionally: the draft is initialised from `value` when the sheet opens. */
export function ReservationFilterSheet({ value, canChangeScope, onApply, onClose }: ReservationFilterSheetProps) {
  const [draft, setDraft] = useState(value);

  return (
    <BottomSheet visible title="Filtres" onClose={onClose}>
      <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
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

        {canChangeScope ? (
          <>
            <Text style={styles.groupTitle}>Réservations affichées</Text>
            <View style={styles.options}>
              <FilterOptionChip
                label="Mes réservations"
                selected={draft.scope === 'mine'}
                onPress={() => setDraft({ ...draft, scope: 'mine' })}
              />
              <FilterOptionChip
                label="Mon périmètre"
                selected={draft.scope === 'scope'}
                onPress={() => setDraft({ ...draft, scope: 'scope' })}
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.sheetActions}>
        <Button
          title="Réinitialiser"
          variant="ghost"
          style={styles.sheetButton}
          onPress={() =>
            setDraft({ ...DEFAULT_RESERVATION_FILTERS, resourceType: draft.resourceType })
          }
        />
        <Button title="Appliquer" style={styles.sheetButton} onPress={() => onApply(draft)} />
      </View>
    </BottomSheet>
  );
}

export function FilterOptionChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      {selected ? <Check size={15} color={colors.primary} strokeWidth={2.75} /> : null}
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipsScroll: {
    flex: 1,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.white,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#F4FAF6',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
  sheetScroll: {
    maxHeight: 360,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F4FAF6',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sheetButton: {
    flex: 1,
  },
});
