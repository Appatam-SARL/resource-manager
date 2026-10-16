import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getBaseUrl } from '@/api/client';
import { getLoginErrorMessage, useAuth } from '@/features/auth/auth-provider';
import { loginSchema, type LoginFormValues } from '@/schemas/login-schema';
import { BrandLogo } from '@/components/brand-logo';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { FadeIn } from '@/components/motion';
import { colors, radius, spacing } from '@/constants/theme';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';

export default function LoginScreen() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const apiUrl = getBaseUrl();

  const { email: emailFromReset } = useLocalSearchParams<{ email?: string }>();

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!emailFromReset) return;
    setValue('email', emailFromReset);
    setValue('password', '');
  }, [emailFromReset, setValue]);

  if (authLoading) {
    return <LoadingState fullScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      router.replace('/(app)');
    } catch (error) {
      const message = getLoginErrorMessage(error);
      Alert.alert(
        'Connexion impossible',
        __DEV__ ? `${message}\n\nAPI: ${apiUrl}` : message,
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen scroll keyboard padded={false} animated={false}>
      <Animated.View
        entering={FadeInUp.duration(400).reduceMotion(ReduceMotion.System)}
        style={styles.hero}
      >
        <BrandLogo size={64} rim style={styles.brandMark} />
        <Text style={styles.brand}>SUZANG HUB</Text>
        <Text style={styles.welcome}>Bienvenue</Text>
        <Text style={styles.subtitle}>
          Connectez-vous pour gérer vos réservations de véhicules et de salles.
        </Text>
      </Animated.View>

      <FadeIn delay={120}>
      <View style={styles.formCard}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Adresse e-mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.email?.message}
              accessibilityLabel="Adresse e-mail"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Mot de passe"
              secureTextEntry
              passwordToggle
              autoComplete="password"
              textContentType="password"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.password?.message}
              accessibilityLabel="Mot de passe"
            />
          )}
        />

        <Pressable
          accessibilityRole="link"
          accessibilityHint="Ouvre l’écran de réinitialisation du mot de passe"
          hitSlop={8}
          onPress={() =>
            router.push({
              pathname: '/(auth)/forgot-password',
              params: { email: getValues('email').trim() },
            })
          }
          style={({ pressed }) => [styles.forgotLink, pressed && styles.forgotLinkPressed]}
        >
          <Text style={styles.forgotLinkText}>Mot de passe oublié ?</Text>
        </Pressable>

        <Button
          title="Se connecter"
          onPress={onSubmit}
          loading={submitting}
          accessibilityLabel="Se connecter"
        />

        {__DEV__ ? (
          <Text style={styles.devHint} accessibilityLabel={`URL API ${apiUrl}`}>
            API : {apiUrl}
          </Text>
        ) : null}
      </View>
      </FadeIn>
    </Screen>
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
  welcome: {
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
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    paddingVertical: spacing.xs,
  },
  forgotLinkPressed: {
    opacity: 0.6,
  },
  forgotLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  devHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
