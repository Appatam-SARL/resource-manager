import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Car, ChevronLeft, DoorOpen } from 'lucide-react-native';
import type { ResourceType } from '@resource-manager/types';
import { colors, radius, spacing } from '@/constants/theme';

export const RESOURCE_TYPE_COPY: Record<
  ResourceType,
  { label: string; subtitle: string; icon: typeof Car }
> = {
  VEHICLE: {
    label: 'Véhicule',
    subtitle: 'Réservez un véhicule pour votre déplacement',
    icon: Car,
  },
  ROOM: {
    label: 'Salle de réunion',
    subtitle: 'Réservez une salle pour votre réunion',
    icon: DoorOpen,
  },
};

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(app)/reservations');
  }
}

type ReservationHeaderProps = {
  resourceType: ResourceType;
  /** Hidden once the request has been sent. */
  onTypeChange?: (type: ResourceType) => void;
};

export function ReservationHeader({ resourceType, onTypeChange }: ReservationHeaderProps) {
  const copy = RESOURCE_TYPE_COPY[resourceType];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
          onPress={goBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={2.25} />
        </Pressable>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            Nouvelle réservation
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {copy.subtitle}
          </Text>
        </View>
      </View>

      {onTypeChange ? (
        <View style={styles.segmented} accessibilityRole="tablist">
          {(Object.keys(RESOURCE_TYPE_COPY) as ResourceType[]).map((type) => {
            const { label, icon: Icon } = RESOURCE_TYPE_COPY[type];
            const active = type === resourceType;
            return (
              <Pressable
                key={type}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
                onPress={() => onTypeChange(type)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Icon size={18} color={active ? colors.primary : colors.textMuted} strokeWidth={2.25} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: '#E8EAED',
  },
  segment: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
