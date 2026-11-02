import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { describeError, isStatus } from '@/api/errors';
import { Divider, FieldRow, FormError, Group, Pill, Screen, Sub, TextButton, Title, TopBar } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, type } from '@/theme';

export default function Login() {
  const params = useLocalSearchParams<{ email?: string; verified?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setRejected(false);
    try {
      const me = await signIn(email, password);
      // A brand-new account has no taste yet: ask once, right after the first sign-in.
      router.replace(me && me.genres.length === 0 ? '/taste' : '/(tabs)');
    } catch (e) {
      // The API answers every sign-in failure with the same bodiless 401, so say all the possible causes.
      setRejected(isStatus(e, 401));
      setError(isStatus(e, 401) ? 'E-posta veya şifre hatalı ya da e-postanı henüz doğrulamadın.' : describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <TopBar />
      <Title>Tekrar hoş geldin</Title>
      <Sub>Hesabına giriş yap.</Sub>
      {params.verified === '1' && <Text style={[type.subhead, { color: colors.secondary, marginTop: 12 }]}>E-postan doğrulandı. Şimdi giriş yapabilirsin.</Text>}

      <Group style={{ marginTop: 28 }}>
        <FieldRow label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
        <FieldRow
          label="Şifre" value={password} onChangeText={setPassword} secureTextEntry={!show} textContentType="password" onSubmitEditing={submit}
          right={<TextButton title={show ? 'Gizle' : 'Göster'} muted onPress={() => setShow((s) => !s)} />}
        />
      </Group>
      <FormError message={error} />
      {rejected && (
        <View style={{ alignItems: 'flex-start' }}>
          <TextButton title="Doğrulama e-postasını tekrar gönder" onPress={() => router.push({ pathname: '/verify', params: { email } })} />
        </View>
      )}
      <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
        <TextButton title="Şifremi unuttum" onPress={() => router.push('/forgot')} />
      </View>

      <Pill title={busy ? 'Giriş yapılıyor…' : 'Giriş yap'} disabled={busy || !email.includes('@') || !password} style={{ marginTop: 8 }} onPress={submit} />
      <Divider label="ya da" />
      <View style={{ gap: 10 }}>
        <Pill title="Google ile devam et" variant="secondary" disabled />
        <Pill title="Facebook ile devam et" variant="secondary" disabled />
      </View>

      <View style={{ marginTop: 'auto', paddingTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
        <Text style={[type.subhead, { color: colors.secondary }]}>Hesabın yok mu?</Text>
        <TextButton title="Hesap oluştur" weight="600" onPress={() => router.replace('/signup')} />
      </View>
    </Screen>
  );
}
