import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/client';

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword({ email }),
    retry: 0,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { email: string; code: string; newPassword: string }) =>
      authApi.resetPassword(body),
    retry: 0,
  });
}

/** Seconds left before `restart()` may be called again; starts running immediately. */
export function useCountdown(seconds: number): { secondsLeft: number; restart: () => void } {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000);
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return { secondsLeft, restart: () => setEndsAt(Date.now() + seconds * 1000) };
}
