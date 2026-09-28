import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/Icon';
import { Check, Divider, FieldRow, Group, Pill, Screen, Sub, tap, TextButton, Title, TopBar } from '@/components/ui';
import { colors, type } from '@/theme';

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-ZÇĞİÖŞÜ]/.test(p) && /[a-zçğıöşü]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^\w\s]/.test(p)) s++;
  return s;
}
const strengthLabel = ['Çok zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok güçlü'];

export default function Signup() {
  const [name, setName] = useState('Yasir');
  const [username, setUsername] = useState('yasir');
  const [email, setEmail] = useState('yasir@ornek.com');
  const [password, setPassword] = useState('Plak-2026');
  const [agreed, setAgreed] = useState(true);
  const s = useMemo(() => strength(password), [password]);
  const usernameOk = /^[a-z0-9_.]{3,20}$/.test(username);
  const valid = agreed && name.length > 0 && usernameOk && email.includes('@') && s >= 2;

  return (
    <Screen scroll>
      <TopBar />
      <Title>Hesap oluştur</Title>
      <Sub>Bir dakikanı alır.</Sub>

      <Group style={{ marginTop: 24 }}>
        <FieldRow label="Ad" labelWidth={108} value={name} onChangeText={setName} textContentType="givenName" />
        <FieldRow
          label="Kullanıcı adı" labelWidth={108} value={username} autoCapitalize="none" autoCorrect={false}
          onChangeText={(t) => setUsername(t.replace(/^@/, '').toLowerCase())}
          right={usernameOk ? <Icon name="check" size={20} /> : undefined}
        />
        <FieldRow label="E-posta" labelWidth={108} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />
        <FieldRow label="Şifre" labelWidth={108} value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
      </Group>

      <View style={{ marginTop: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`Şifre gücü: ${strengthLabel[s]}`}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < s ? colors.label : colors.track }} />)}
        </View>
        <Text style={[type.footnote, { color: colors.secondary }]}>{strengthLabel[s]}</Text>
      </View>

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => { tap(); setAgreed((a) => !a); }} style={{ marginTop: 20, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
        <Check on={agreed} round />
        <Text style={[type.subhead, { flex: 1, lineHeight: 20 }]}>Kullanım Koşulları’nı ve Gizlilik Politikası’nı okudum, kabul ediyorum.</Text>
      </Pressable>

      {/* TODO: api.signup({ name, username, email, password }) */}
      <Pill title="Devam et" disabled={!valid} style={{ marginTop: 20 }} onPress={() => router.push('/verify')} />

      <Divider label="ya da" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pill title="Google" variant="secondary" style={{ flex: 1 }} />
        <Pill title="Facebook" variant="secondary" style={{ flex: 1 }} />
      </View>

      <View style={{ marginTop: 'auto', paddingTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
        <Text style={[type.subhead, { color: colors.secondary }]}>Zaten hesabın var mı?</Text>
        <TextButton title="Giriş yap" weight="600" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}
