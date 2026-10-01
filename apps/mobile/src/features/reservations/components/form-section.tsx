import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { colors, spacing } from '@/constants/theme';

type FormSectionProps = {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function FormSection({ step, title, description, children, onLayout }: FormSectionProps) {
  return (
    <View style={styles.section} onLayout={onLayout}>
      <View style={styles.header}>
        <View style={styles.step} importantForAccessibility="no-hide-descendants">
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
});
