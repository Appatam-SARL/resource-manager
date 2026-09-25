import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeIn } from '@/components/motion';
import { colors, spacing } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  padded?: boolean;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  keyboard = false,
  padded = true,
  animated = true,
  style,
  contentStyle,
}: ScreenProps) {
  const inner = animated ? <FadeIn style={{ flex: 1 }}>{children}</FadeIn> : children;

  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        padded && styles.padded,
        styles.scrollContent,
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {animated ? <FadeIn>{children}</FadeIn> : children}
    </ScrollView>
  ) : (
    <View style={[padded && styles.padded, styles.fill, contentStyle]}>
      {inner}
    </View>
  );

  const body = keyboard ? (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
