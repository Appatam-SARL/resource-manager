import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Show an eye button to reveal / hide the value (for password fields). */
  passwordToggle?: boolean;
};

export function Input({
  label,
  error,
  passwordToggle = false,
  secureTextEntry,
  style,
  accessibilityLabel,
  ...rest
}: InputProps) {
  const [visible, setVisible] = useState(false);
  const isSecure = Boolean(secureTextEntry) && !(passwordToggle && visible);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, error ? styles.fieldError : null]}>
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecure}
          style={[styles.input, passwordToggle ? styles.inputWithToggle : null, style]}
          {...rest}
        />
        {passwordToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            hitSlop={8}
            onPress={() => setVisible((current) => !current)}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
          >
            {visible ? (
              <EyeOff size={20} color={colors.textMuted} accessibilityElementsHidden />
            ) : (
              <Eye size={20} color={colors.textMuted} accessibilityElementsHidden />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.md,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  inputWithToggle: {
    paddingRight: spacing.xs,
  },
  toggle: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  togglePressed: {
    opacity: 0.6,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
});
