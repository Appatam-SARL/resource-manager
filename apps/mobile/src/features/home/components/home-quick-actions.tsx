import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Car, ChevronRight, DoorOpen, Plus, type LucideIcon } from 'lucide-react-native';
import type { ResourceType } from '@resource-manager/types';
import { colors, radius, spacing } from '@/constants/theme';

function openNewReservationOfType(type?: ResourceType) {
  router.push(type ? `/(app)/reservations/new?type=${type}` : '/(app)/reservations/new');
}

export function HomeQuickActions() {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nouvelle réservation"
        onPress={() => openNewReservationOfType()}
        style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
      >
        <View style={styles.primaryIcon}>
          <Plus size={20} color={colors.primary} strokeWidth={2.5} />
        </View>
        <View style={styles.primaryText}>
          <Text style={styles.primaryTitle}>Nouvelle réservation</Text>
          <Text style={styles.primarySubtitle}>Véhicule ou salle de réunion</Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </Pressable>

      <View style={styles.tiles}>
        <ActionTile
          icon={Car}
          label="Véhicule"
          hint="Réserver un véhicule"
          onPress={() => openNewReservationOfType('VEHICLE')}
        />
        <ActionTile
          icon={DoorOpen}
          label="Salle"
          hint="Réserver une salle"
          onPress={() => openNewReservationOfType('ROOM')}
        />
      </View>
    </View>
  );
}

function ActionTile({
  icon: Icon,
  label,
  hint,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.tileIcon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.tileText}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileHint} numberOfLines={1}>
          Réserver
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  primaryPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.99 }],
  },
  primaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    flex: 1,
    gap: 2,
  },
  primaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  primarySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tilePressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    flex: 1,
    gap: 1,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  tileHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
