import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LogOut } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

export function LogoutButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Se déconnecter"
        accessibilityHint="Ouvre une confirmation avant la déconnexion"
        onPress={onPress}
        onPressIn={() => scale.set(withTiming(0.97, { duration: 90 }))}
        onPressOut={() => scale.set(withTiming(1, { duration: 140 }))}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <LogOut size={20} color={colors.danger} strokeWidth={2.25} />
        <Text style={styles.label}>Se déconnecter</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: colors.card,
  },
  pressed: {
    backgroundColor: '#FEF2F2',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
  },
});
