import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Package, Pencil } from 'lucide-react-native';
import type { ReservationEquipment } from '@resource-manager/types';
import { colors, radius, spacing } from '@/constants/theme';

type ReservationEquipmentsCardProps = {
  equipments: ReservationEquipment[] | undefined;
  canEdit: boolean;
  onEdit: () => void;
};

export function ReservationEquipmentsCard({ equipments, canEdit, onEdit }: ReservationEquipmentsCardProps) {
  const items = equipments ?? [];
  if (items.length === 0 && !canEdit) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Équipements
        </Text>
        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Modifier les équipements"
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
          >
            <Pencil size={14} color={colors.primary} />
            <Text style={styles.editText}>Modifier les équipements</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.card}>
        {items.length === 0 ? (
          <Text style={styles.empty}>Aucun équipement demandé.</Text>
        ) : (
          items.map((item, index) => (
            <View
              key={item.equipment.id}
              style={[styles.row, index > 0 && styles.rowDivider]}
              accessible
              accessibilityLabel={`${item.equipment.name}, quantité ${item.quantity}`}
            >
              <View style={styles.iconTile}>
                <Package size={17} color={colors.primary} />
              </View>
              <Text style={styles.name}>{item.equipment.name}</Text>
              <Text style={styles.quantity}>× {item.quantity}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
  editText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  quantity: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
