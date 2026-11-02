import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { describeError } from '@/api/errors';
import { ApiError } from '@/api/client';
import { googleReady } from '@/lib/social';
import { useAuth } from '@/state/auth';
import { FormError, Pill } from './ui';

/** "Continue with Google" on the welcome forms: signs in, or creates the account on first use. */
export function GoogleButton() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const me = await signInWithGoogle();
      if (me === undefined) return; // closed the page
      router.replace(me && me.genres.length === 0 ? '/taste' : '/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? describeError(e) : 'Google ile giriş tamamlanamadı. Tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Pill title={busy ? 'Google bekleniyor…' : 'Google ile devam et'} variant="secondary" disabled={busy || !googleReady} onPress={go} />
      <FormError message={error} />
    </View>
  );
}
