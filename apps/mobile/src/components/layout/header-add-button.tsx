import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { HeaderActions } from '@/components/layout/header-actions';
import { colors, spacing } from '@/constants/theme';

export function openNewReservation() {
  router.push('/(app)/reservations/new');
}

/** [+] "Nouvelle réservation" followed by the usual header actions. */
export function HeaderActionsWithAdd() {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nouvelle réservation"
        hitSlop={4}
        onPress={openNewReservation}
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
      >
        <Plus size={22} color={colors.white} strokeWidth={2.5} />
      </Pressable>
      <HeaderActions />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    backgroundColor: colors.primaryLight,
  },
});
