import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/api/client';
import { describeError, extractToken, isStatus } from '@/api/errors';
import { FieldHint, FieldRow, FormError, Group, Pill, Screen, Sub, TextButton, Title, TopBar } from '@/components/ui';

/** Opened by the link in the reset mail (musicroom://reset?token=…) or by pasting its code. */
export default function Reset() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.auth.resetPassword(extractToken(token), password);
      router.replace('/login');
    } catch (e) {
      setError(
        isStatus(e, 400) ? 'Kod tanınmadı. Maildeki kodu ya da linkin tamamını eksiksiz yapıştır; daha önce kullanıldıysa yeni bir sıfırlama maili iste.'
          : isStatus(e, 410) ? 'Bağlantının süresi dolmuş (1 saat). Yeni bir sıfırlama maili iste.'
            : describeError(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <TopBar />
      <Title>Yeni şifre belirle</Title>
      <Sub>Şifren değişince tüm cihazlardaki oturumların kapanır.</Sub>

      <Group style={{ marginTop: 28 }}>
        {!params.token && <FieldRow label="Kod" labelWidth={96} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholder="E-postadaki kod" />}
        <FieldRow
          label="Yeni şifre" labelWidth={96} value={password} onChangeText={setPassword} secureTextEntry={!show} textContentType="newPassword"
          right={<TextButton title={show ? 'Gizle' : 'Göster'} muted onPress={() => setShow((s) => !s)} />}
        />
      </Group>
      <FieldHint ok={password.length >= 12}>{password.length > 0 && password.length < 12 ? `${12 - password.length} karakter daha gerek (en az 12).` : 'En az 12 karakter.'}</FieldHint>

      <FormError message={error} />
      <Pill title={busy ? 'Kaydediliyor…' : 'Şifreyi değiştir'} disabled={busy || !token.trim() || password.length < 12} style={{ marginTop: 24 }} onPress={submit} />
    </Screen>
  );
}
