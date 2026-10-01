import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { AlertCircle, type LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

type FormFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  icon: LucideIcon;
  optional?: boolean;
  error?: string;
};

export function FormField({
  label,
  icon: Icon,
  optional = false,
  error,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optionnel)</Text> : null}
      </Text>
      <View
        style={[
          styles.control,
          multiline && styles.controlMultiline,
          focused && styles.controlFocused,
          error ? styles.controlError : null,
        ]}
      >
        <Icon
          size={20}
          color={error ? colors.danger : focused ? colors.primary : colors.textMuted}
          style={multiline ? styles.iconTop : undefined}
        />
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.inputMultiline]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityRole="alert">
          <AlertCircle size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optional: {
    fontWeight: '400',
    color: colors.textMuted,
  },
  control: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  controlMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  controlFocused: {
    borderColor: colors.primary,
  },
  controlError: {
    borderColor: colors.danger,
  },
  iconTop: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 72,
    paddingVertical: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
  },
});
