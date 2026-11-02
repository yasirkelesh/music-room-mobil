import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { GoogleButton } from '@/components/GoogleButton';
import { Check, Divider, FieldHint, FieldRow, FormError, Group, Pill, Screen, Sub, tap, TextButton, Title, TopBar } from '@/components/ui';
import { colors, type } from '@/theme';

// The API wants 12–64 characters (and checks breached/contextual passwords itself).
const MIN = 12;
const MAX = 64;

function strength(p: string) {
  let s = 0;
  if (p.length >= MIN) s++;
  if (/[A-ZÇĞİÖŞÜ]/.test(p) && /[a-zçğıöşü]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^\w\s]/.test(p)) s++;
  return s;
}
const strengthLabel = ['Çok zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok güçlü'];

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = useMemo(() => strength(password), [password]);
  const valid = agreed && name.trim().length > 0 && email.includes('@') && password.length >= MIN && password.length <= MAX;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      // Always 202, registered address or not: the mailbox tells the real owner what happened.
      await api.auth.register({ email: email.trim(), password, displayName: name.trim() });
      router.push({ pathname: '/verify', params: { email: email.trim() } });
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <TopBar />
      <Title>Hesap oluştur</Title>
      <Sub>Bir dakikanı alır.</Sub>

      <Group style={{ marginTop: 24 }}>
        <FieldRow label="Ad" labelWidth={108} value={name} onChangeText={setName} textContentType="nickname" autoCorrect={false} />
        <FieldRow label="E-posta" labelWidth={108} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
        <FieldRow
          label="Şifre" labelWidth={108} value={password} onChangeText={setPassword} secureTextEntry={!show} textContentType="newPassword"
          right={<TextButton title={show ? 'Gizle' : 'Göster'} muted onPress={() => setShow((v) => !v)} />}
        />
      </Group>

      <FieldHint ok={password.length >= MIN}>
        {password.length > 0 && password.length < MIN ? `${MIN - password.length} karakter daha gerek (en az ${MIN}).` : `En az ${MIN} karakter. Harf, rakam ve sembol karıştırmak güçlendirir.`}
      </FieldHint>
      {/* neutral until there is something to rate */}
      {password.length > 0 && (
        <View style={{ marginTop: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`Şifre gücü: ${strengthLabel[s]}`}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < s ? colors.label : colors.track }} />)}
          </View>
          <Text style={[type.footnote, { color: colors.secondary }]}>{strengthLabel[s]}</Text>
        </View>
      )}

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => { tap(); setAgreed((a) => !a); }} style={{ marginTop: 20, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
        <Check on={agreed} round />
        <Text style={[type.subhead, { flex: 1, lineHeight: 20 }]}>Kullanım Koşulları’nı ve Gizlilik Politikası’nı okudum, kabul ediyorum.</Text>
      </Pressable>

      <FormError message={error} />
      <Pill title={busy ? 'Gönderiliyor…' : 'Devam et'} disabled={!valid || busy} style={{ marginTop: 20 }} onPress={submit} />
      {!valid && !busy && <FieldHint>{!name.trim() ? 'Adını yaz.' : !email.includes('@') ? 'Geçerli bir e-posta gir.' : password.length < MIN ? `Şifre en az ${MIN} karakter olmalı.` : password.length > MAX ? `Şifre en fazla ${MAX} karakter olabilir.` : 'Devam etmek için koşulları kabul et.'}</FieldHint>}

      <Divider label="ya da" />
      <GoogleButton />

      <View style={{ marginTop: 'auto', paddingTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
        <Text style={[type.subhead, { color: colors.secondary }]}>Zaten hesabın var mı?</Text>
        <TextButton title="Giriş yap" weight="600" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}
