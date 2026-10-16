import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { BrandLogo } from '@/components/brand-logo';
import { Screen } from '@/components/ui/Screen';
import { FadeIn } from '@/components/motion';
import { colors, radius, spacing } from '@/constants/theme';

type AuthScreenLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/** Same hero + card frame as the login screen, for the other unauthenticated screens. */
export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  return (
    <Screen scroll keyboard padded={false} animated={false}>
      <Animated.View
        entering={FadeInUp.duration(400).reduceMotion(ReduceMotion.System)}
        style={styles.hero}
      >
        <BrandLogo size={56} rim style={styles.brandMark} />
        <Text style={styles.brand}>SUZANG HUB</Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>

      <FadeIn delay={120}>
        <View style={styles.formCard}>{children}</View>
      </FadeIn>
    </Screen>
  );
}

export function AuthNotice({ message, tone = 'info' }: { message: string; tone?: 'info' | 'error' }) {
  const isError = tone === 'error';
  return (
    <View
      style={[styles.notice, isError ? styles.noticeError : styles.noticeInfo]}
      accessibilityRole={isError ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.noticeText, isError && styles.noticeTextError]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: spacing.sm,
  },
  brandMark: {
    marginBottom: spacing.sm,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryMuted,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  formCard: {
    marginTop: -spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notice: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeInfo: {
    backgroundColor: colors.primaryMuted,
  },
  noticeError: {
    backgroundColor: '#FEF2F2',
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  noticeTextError: {
    color: colors.danger,
  },
});
