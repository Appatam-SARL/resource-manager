'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Leaf, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@resource-manager/api-client';
import {
  loginSchema,
  type LoginFormValues,
} from '@/features/auth/schemas/login-schema';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FadeIn } from '@/components/motion';
import { motion, useReducedMotion } from 'motion/react';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/dashboard';
  }
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      toast.success('Connexion réussie');
      router.push(safeNextPath(searchParams.get('next')));
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Impossible de se connecter. Réessayez.';
      setFormError(message);
      toast.error(message);
    }
  });

  const reduceMotion = useReducedMotion();

  return (
    <FadeIn y={20} className="w-full max-w-md">
      <motion.div
        initial={reduceMotion ? false : { scale: 0.96 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
    <Card className="w-full [--card-spacing:--spacing(6)]">
      <CardHeader className="items-center text-center">
        <motion.div
          className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          initial={reduceMotion ? false : { rotate: -12, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
        >
          <Leaf className="size-7" aria-hidden />
        </motion.div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-primary">
          Resource Manager
        </CardTitle>
        <CardDescription className="text-sm">
          Connectez-vous à l’espace d’administration
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="prenom.nom@entreprise.fr"
              className="h-11 rounded-xl"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 rounded-xl"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-sm font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Connexion…
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Démo :{' '}
          <span className="font-medium text-foreground">
            group.admin@appatam.dev
          </span>
        </p>
      </CardContent>
    </Card>
      </motion.div>
    </FadeIn>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Chargement…
          </CardContent>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
