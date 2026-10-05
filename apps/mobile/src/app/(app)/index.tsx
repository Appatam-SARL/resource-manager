import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Building2 } from 'lucide-react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { useNow } from '@/hooks/use-now';
import { useHomeOverview } from '@/features/home/hooks/use-home-overview';
import { getGreeting } from '@/features/home/lib/home';
import { HomeHeroCard, HomeHeroEmpty } from '@/features/home/components/home-hero-card';
import { HomeQuickActions } from '@/features/home/components/home-quick-actions';
import { HomeActivityEmpty, HomeActivityRow } from '@/features/home/components/home-activity';
import { HomeActivitySkeleton, HomeErrorCard, HomeHeroSkeleton } from '@/features/home/components/home-states';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/app-header';
import { openNewReservation } from '@/components/layout/header-add-button';
import { FadeIn } from '@/components/motion';
import { colors, radius, spacing } from '@/constants/theme';

function openReservation(id: string) {
  router.push(`/(app)/reservations/${id}`);
}

export default function HomeScreen() {
  const { user } = useAuth();
  const now = useNow(60_000);
  const home = useHomeOverview(user?.id, now);
  const overview = home.overview;
  const showContent = !home.isLoading && overview !== null;

  const title = user?.firstName ? `${getGreeting(now)}, ${user.firstName}` : getGreeting(now);
  const organization = user
    ? [user.company.name, user.direction?.name].filter(Boolean).join(' · ')
    : null;

  let hero: ReactNode;
  let activity: ReactNode;
  if (home.isError) {
    hero = <HomeErrorCard onRetry={() => void home.refresh()} retrying={home.isRetrying} />;
    activity = null;
  } else if (!showContent) {
    hero = <HomeHeroSkeleton />;
    activity = <HomeActivitySkeleton />;
  } else {
    hero = overview.highlight ? (
      <HomeHeroCard highlight={overview.highlight} onPress={openReservation} />
    ) : (
      <HomeHeroEmpty onCreate={openNewReservation} />
    );
    activity =
      overview.activity.length > 0 ? (
        <View style={styles.list}>
          {overview.activity.map((entry) => (
            <HomeActivityRow key={entry.id} entry={entry} onPress={openReservation} />
          ))}
        </View>
      ) : (
        <HomeActivityEmpty />
      );
  }

  return (
    <Screen padded={false}>
      <AppHeader title={title} subtitle="Votre espace de réservation" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={home.refreshing}
            onRefresh={() => void home.refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {organization ? (
          <View
            style={styles.organization}
            accessible
            accessibilityLabel={`Périmètre : ${organization}`}
          >
            <Building2 size={14} color={colors.primary} />
            <Text style={styles.organizationText} numberOfLines={1}>
              {organization}
            </Text>
          </View>
        ) : null}

        <FadeIn>{hero}</FadeIn>

        <FadeIn delay={80} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Actions rapides
          </Text>
          <HomeQuickActions />
        </FadeIn>

        {activity ? (
          <FadeIn delay={160} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Activité récente
              </Text>
              {showContent && overview.pendingCount > 0 ? (
                <Text style={styles.pendingPill}>
                  {overview.pendingCount} en attente
                </Text>
              ) : null}
            </View>
            {activity}
            {showContent ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Voir toutes mes réservations"
                onPress={() => router.push('/(app)/reservations')}
                hitSlop={6}
                style={({ pressed }) => [styles.allLink, pressed && styles.pressed]}
              >
                <Text style={styles.allLinkText}>Voir toutes mes réservations</Text>
                <ArrowRight size={16} color={colors.primary} />
              </Pressable>
            ) : null}
          </FadeIn>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  organization: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    maxWidth: '100%',
    marginBottom: -spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryMuted,
  },
  organizationText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  pendingPill: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.xl,
    backgroundColor: '#FEF3C7',
    overflow: 'hidden',
  },
  list: {
    gap: spacing.sm,
  },
  allLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  allLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
