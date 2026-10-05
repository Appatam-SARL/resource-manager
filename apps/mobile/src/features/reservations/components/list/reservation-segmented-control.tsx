import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TemporalSegment } from '@/features/reservations/lib/reservation-list';
import { colors, radius, spacing } from '@/constants/theme';

const SEGMENTS: { value: TemporalSegment; label: string }[] = [
  { value: 'upcoming', label: 'À venir' },
  { value: 'active', label: 'En cours' },
  { value: 'history', label: 'Historique' },
];

type ReservationSegmentedControlProps = {
  value: TemporalSegment;
  onChange: (segment: TemporalSegment) => void;
  /** Only real counts; undefined hides the counter. */
  counts: Partial<Record<TemporalSegment, number>>;
};

export function ReservationSegmentedControl({ value, onChange, counts }: ReservationSegmentedControlProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {SEGMENTS.map((segment) => {
        const active = segment.value === value;
        const count = counts[segment.value];
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={count !== undefined ? `${segment.label}, ${count}` : segment.label}
            onPress={() => onChange(segment.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {segment.label}
            </Text>
            {count !== undefined && count > 0 ? (
              <View
                style={[
                  styles.count,
                  active && styles.countActive,
                  segment.value === 'active' && styles.countLive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    (active || segment.value === 'active') && styles.countTextActive,
                  ]}
                >
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: '#E8EAED',
  },
  segment: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(107,114,128,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countActive: {
    backgroundColor: colors.primary,
  },
  countLive: {
    backgroundColor: colors.success,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  countTextActive: {
    color: colors.white,
  },
});
