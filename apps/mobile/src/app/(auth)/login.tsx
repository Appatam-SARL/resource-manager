import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getBaseUrl } from '@/api/client';
import { getLoginErrorMessage, useAuth } from '@/features/auth/auth-provider';
import { loginSchema, type LoginFormValues } from '@/schemas/login-schema';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { FadeIn } from '@/components/motion';
import { colors, radius, spacing } from '@/constants/theme';
import { MotiView } from 'moti';

export default function LoginScreen() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const apiUrl = getBaseUrl();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'employee@appatam.dev',
      password: 'Password123!',
    },
  });

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
      <MotiView
        from={{ opacity: 0, translateY: -16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.hero}
      >
        <Text style={styles.brand}>Resource Manager</Text>
        <Text style={styles.welcome}>Bienvenue</Text>
        <Text style={styles.subtitle}>
          Connectez-vous pour gérer vos réservations de véhicules et de salles.
        </Text>
      </MotiView>

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
  devHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
