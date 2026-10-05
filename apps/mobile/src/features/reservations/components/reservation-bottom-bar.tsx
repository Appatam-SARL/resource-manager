import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Send } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

type ReservationBottomBarProps = {
  label: string;
  loading: boolean;
  onPress: () => void;
  /** Short recap of the current selection, e.g. "Toyota Corolla · Lun. 28 sept. · 09:00 → 11:00". */
  recap?: string | null;
  error?: string | null;
};

export function ReservationBottomBar({ label, loading, onPress, recap, error }: ReservationBottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {error ? (
        <Animated.View
          entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <AlertCircle size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      ) : recap ? (
        <Text style={styles.recap} numberOfLines={1}>
          {recap}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: loading, disabled: loading }}
        disabled={loading}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonLoading]}
      >
        {loading ? (
          <>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.buttonText}>Envoi en cours…</Text>
          </>
        ) : (
          <>
            <Send size={18} color={colors.white} strokeWidth={2.25} />
            <Text style={styles.buttonText}>{label}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  recap: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  button: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  buttonPressed: {
    backgroundColor: colors.primaryLight,
  },
  buttonLoading: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
});
