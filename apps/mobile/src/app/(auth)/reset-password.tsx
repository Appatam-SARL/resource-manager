import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck, Circle } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthNotice, AuthScreenLayout } from '@/features/auth/components/auth-screen-layout';
import {
  useCountdown,
  useForgotPassword,
  useResetPassword,
} from '@/features/auth/hooks/use-password-reset';
import {
  formatResendLabel,
  getPasswordResetErrorMessage,
  PASSWORD_RESET_SENT_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
  RESEND_COOLDOWN_SECONDS,
} from '@/features/auth/lib/password-reset';
import {
  PASSWORD_RULES,
  RESET_CODE_LENGTH,
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/schemas/password-reset-schema';
import { colors, spacing } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const resetPassword = useResetPassword();
  const forgotPassword = useForgotPassword();
  const resend = useCountdown(RESEND_COOLDOWN_SECONDS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState(PASSWORD_RESET_SENT_MESSAGE);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = useWatch({ control, name: 'newPassword' });

  if (!email) {
    return <Redirect href="/(auth)/forgot-password" />;
  }

  const goToLogin = () => router.dismissTo({ pathname: '/(auth)/login', params: { email } });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    try {
      await resetPassword.mutateAsync({
        email,
        code: values.code,
        newPassword: values.newPassword,
      });
      Alert.alert('Mot de passe modifié', PASSWORD_RESET_SUCCESS_MESSAGE, [
        { text: 'Se connecter', onPress: goToLogin },
      ], { cancelable: false });
    } catch (error) {
      setErrorMessage(getPasswordResetErrorMessage(error));
    }
  });

  const onResend = async () => {
    setErrorMessage(null);
    try {
      await forgotPassword.mutateAsync(email);
      resend.restart();
      setInfoMessage(`Nouvelle demande envoyée. ${PASSWORD_RESET_SENT_MESSAGE}`);
    } catch (error) {
      setErrorMessage(getPasswordResetErrorMessage(error));
    }
  };

  return (
    <AuthScreenLayout
      title="Vérification"
      subtitle={`Saisissez le code à ${RESET_CODE_LENGTH} chiffres reçu à l’adresse ${email}, puis choisissez un nouveau mot de passe.`}
    >
      <AuthNotice message={infoMessage} />
      {errorMessage ? <AuthNotice tone="error" message={errorMessage} /> : null}

      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Code de vérification"
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={RESET_CODE_LENGTH}
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
            value={value}
            onBlur={onBlur}
            onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
            error={errors.code?.message}
            style={styles.codeInput}
          />
        )}
      />

      <Controller
        control={control}
        name="newPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Nouveau mot de passe"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.newPassword?.message}
          />
        )}
      />

      <View style={styles.rules} accessibilityLabel="Règles du mot de passe">
        {PASSWORD_RULES.map((rule) => {
          const satisfied = newPassword.length > 0 && rule.isSatisfied(newPassword);
          const Icon = satisfied ? CircleCheck : Circle;
          return (
            <View
              key={rule.id}
              style={styles.rule}
              accessible
              accessibilityLabel={`${rule.label} : ${satisfied ? 'respecté' : 'non respecté'}`}
            >
              <Icon size={16} color={satisfied ? colors.success : colors.textMuted} />
              <Text style={[styles.ruleText, satisfied && styles.ruleTextSatisfied]}>{rule.label}</Text>
            </View>
          );
        })}
      </View>

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Confirmer le mot de passe"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            onSubmitEditing={() => void onSubmit()}
            error={errors.confirmPassword?.message}
          />
        )}
      />

      <Button
        title="Modifier le mot de passe"
        onPress={() => void onSubmit()}
        loading={resetPassword.isPending}
      />
      <Button
        title={formatResendLabel(resend.secondsLeft)}
        variant="ghost"
        disabled={resend.secondsLeft > 0}
        loading={forgotPassword.isPending}
        onPress={() => void onResend()}
        accessibilityHint="Envoie un nouveau code de vérification par e-mail"
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    fontSize: 22,
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  rules: {
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  ruleTextSatisfied: {
    color: colors.success,
  },
});
