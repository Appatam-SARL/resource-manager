import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

type FixedEquipmentFilterProps = {
  options: string[];
  selected: string[];
  onToggle: (label: string) => void;
};

/** Toggle chips: only rooms equipped with every selected label are listed. */
export function FixedEquipmentFilter({ options, selected, onToggle }: FixedEquipmentFilterProps) {
  if (options.length === 0) return null;
  const selectedKeys = new Set(selected.map((label) => label.toLocaleLowerCase('fr')));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      accessibilityLabel="Filtrer par équipement fixe"
    >
      {options.map((label) => {
        const active = selectedKeys.has(label.toLocaleLowerCase('fr'));
        return (
          <Pressable
            key={label}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`Équipement fixe : ${label}`}
            onPress={() => onToggle(label)}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
          >
            {active ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -spacing.lg,
    flexGrow: 0,
  },
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  labelActive: {
    color: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
});
