import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { AlertCircle, Bell, Briefcase, Building2, Network } from 'lucide-react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { useDashboardSummary } from '@/features/dashboard/hooks/use-dashboard';
import {
  usePushPermissionStatus,
  useUnreadNotificationsCount,
} from '@/features/notifications/hooks/use-notifications';
import { openNotificationSettings } from '@/lib/notifications';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AppHeader } from '@/components/layout/app-header';
import { FadeIn, StaggerItem } from '@/components/motion';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import {
  ProfileInfoRow,
  ProfileMenuItem,
  ProfileSection,
} from '@/features/profile/components/profile-section';
import {
  ProfileActivity,
  ProfileActivityError,
  ProfileActivitySkeleton,
} from '@/features/profile/components/profile-activity';
import { LogoutButton } from '@/features/profile/components/logout-button';
import { describePushPermission, getActivityHeading } from '@/features/profile/profile-display';
import { ROLE_LABELS, colors, radius, spacing } from '@/constants/theme';

const APP_VERSION = Constants.expoConfig?.version;

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const summaryQuery = useDashboardSummary();
  const permissionQuery = usePushPermissionStatus();
  const unreadQuery = useUnreadNotificationsCount(Boolean(user));

  const profileQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      await refreshUser();
      return true;
    },
    retry: 1,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { refetch: refetchPermission } = permissionQuery;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetchPermission();
    });
    return () => subscription.remove();
  }, [refetchPermission]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([profileQuery.refetch(), summaryQuery.refetch(), refetchPermission()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setConfirmVisible(false);
      router.replace('/(auth)/login');
    } catch {
      Alert.alert('Erreur', 'Impossible de se déconnecter. Veuillez réessayer.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleNotificationsPress = () => {
    if (permissionQuery.data === 'denied') {
      openNotificationSettings();
      return;
    }
    router.push('/(app)/notifications');
  };

  if (!user) {
    return (
      <Screen padded={false} bottomInset>
        <AppHeader title="Profil" showBack showActions={false} />
        <ProfileSkeleton />
      </Screen>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const activityHeading = getActivityHeading(user);
  const unread = unreadQuery.data ?? 0;
  const reservations = summaryQuery.data?.reservations;

  return (
    <Screen padded={false} bottomInset>
      <AppHeader title="Profil" showBack showActions={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <FadeIn>
          <ProfileHeader
            fullName={fullName}
            email={user.email}
            roleLabel={ROLE_LABELS[user.role]}
          />
        </FadeIn>

        {profileQuery.isError ? (
          <FadeIn>
            <View style={styles.errorBanner} accessibilityRole="alert">
              <AlertCircle size={18} color={colors.danger} />
              <Text style={styles.errorText}>Impossible de charger votre profil.</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Réessayer le chargement du profil"
                onPress={() => void profileQuery.refetch()}
                hitSlop={8}
                style={({ pressed }) => [styles.errorRetry, pressed && styles.pressed]}
              >
                <Text style={styles.errorRetryText}>Réessayer</Text>
              </Pressable>
            </View>
          </FadeIn>
        ) : null}

        <StaggerItem index={1}>
          <ProfileSection title="Profil professionnel">
            <ProfileInfoRow icon={Building2} label="Entreprise" value={user.company.name} />
            {user.direction ? (
              <ProfileInfoRow icon={Network} label="Direction" value={user.direction.name} />
            ) : null}
            <ProfileInfoRow icon={Briefcase} label="Rôle" value={ROLE_LABELS[user.role]} />
          </ProfileSection>
        </StaggerItem>

        <StaggerItem index={2}>
          <ProfileSection title={activityHeading.title} subtitle={activityHeading.subtitle}>
            {summaryQuery.isPending ? (
              <ProfileActivitySkeleton />
            ) : summaryQuery.isError || !reservations ? (
              <ProfileActivityError onRetry={() => void summaryQuery.refetch()} />
            ) : (
              <ProfileActivity
                total={reservations.total}
                pending={reservations.pending}
                approved={reservations.approved}
              />
            )}
          </ProfileSection>
        </StaggerItem>

        <StaggerItem index={3}>
          <ProfileSection title="Préférences">
            <ProfileMenuItem
              icon={Bell}
              title="Notifications"
              description={describePushPermission(permissionQuery.data)}
              accessibilityHint={
                permissionQuery.data === 'denied'
                  ? 'Ouvre les réglages de notification du téléphone'
                  : 'Ouvre la liste de vos notifications'
              }
              trailing={
                unread > 0 ? (
                  <View style={styles.unreadPill}>
                    <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                  </View>
                ) : null
              }
              onPress={handleNotificationsPress}
            />
          </ProfileSection>
        </StaggerItem>

        <StaggerItem index={4} style={styles.logout}>
          <LogoutButton onPress={() => setConfirmVisible(true)} />
        </StaggerItem>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Resource Manager</Text>
          {APP_VERSION ? <Text style={styles.footerVersion}>Version {APP_VERSION}</Text> : null}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={confirmVisible}
        title="Se déconnecter ?"
        message="Vous devrez vous reconnecter pour accéder à votre compte."
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        danger
        loading={loggingOut}
        onConfirm={() => void handleLogout()}
        onCancel={() => setConfirmVisible(false)}
      />
    </Screen>
  );
}

function ProfileSkeleton() {
  return (
    <View
      style={[styles.content, styles.skeleton]}
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement du profil"
    >
      <Skeleton width={96} height={96} radius={48} />
      <Skeleton width={180} height={24} />
      <Skeleton width={140} height={14} />
      <Skeleton width="100%" height={180} radius={radius.lg} style={styles.skeletonBlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
    gap: spacing.xl,
  },
  skeleton: {
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonBlock: {
    marginTop: spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  errorRetry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  errorRetryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
  unreadPill: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  logout: {
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    gap: 2,
    paddingTop: spacing.sm,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  footerVersion: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
