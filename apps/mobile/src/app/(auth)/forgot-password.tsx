import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthNotice, AuthScreenLayout } from '@/features/auth/components/auth-screen-layout';
import { useForgotPassword } from '@/features/auth/hooks/use-password-reset';
import { getPasswordResetErrorMessage } from '@/features/auth/lib/password-reset';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schemas/password-reset-schema';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const forgotPassword = useForgotPassword();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: params.email ?? '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setErrorMessage(null);
    try {
      await forgotPassword.mutateAsync(email);
      router.push({ pathname: '/(auth)/reset-password', params: { email } });
    } catch (error) {
      setErrorMessage(getPasswordResetErrorMessage(error));
    }
  });

  return (
    <AuthScreenLayout
      title="Mot de passe oublié"
      subtitle="Saisissez l’adresse e-mail de votre compte : nous vous enverrons un code de vérification."
    >
      {errorMessage ? <AuthNotice tone="error" message={errorMessage} /> : null}

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
            returnKeyType="send"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            onSubmitEditing={() => void onSubmit()}
            error={errors.email?.message}
          />
        )}
      />

      <Button title="Recevoir un code" onPress={() => void onSubmit()} loading={forgotPassword.isPending} />
      <Button
        title="Retour à la connexion"
        variant="ghost"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
      />
    </AuthScreenLayout>
  );
}
