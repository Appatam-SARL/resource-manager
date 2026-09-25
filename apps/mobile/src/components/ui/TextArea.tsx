import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

type TextAreaProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextArea({
  label,
  error,
  style,
  accessibilityLabel,
  ...rest
}: TextAreaProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
});
