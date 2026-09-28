import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Divider, FieldRow, Group, Pill, Screen, Sub, TextButton, Title, TopBar } from '@/components/ui';
import { colors, type } from '@/theme';

export default function Login() {
  const [email, setEmail] = useState('yasir@ornek.com');
  const [password, setPassword] = useState('gizlisifre42');
  const [show, setShow] = useState(false);

  // TODO: api.login(email, password) → setToken → router.replace('/(tabs)')
  const submit = () => router.replace('/(tabs)');

  return (
    <Screen scroll>
      <TopBar />
      <Title>Tekrar hoş geldin</Title>
      <Sub>Hesabına giriş yap.</Sub>

      <Group style={{ marginTop: 28 }}>
        <FieldRow label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <FieldRow
          label="Şifre" value={password} onChangeText={setPassword} secureTextEntry={!show} textContentType="password"
          right={<TextButton title={show ? 'Gizle' : 'Göster'} muted onPress={() => setShow((s) => !s)} />}
        />
      </Group>
      <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
        <TextButton title="Şifremi unuttum" onPress={() => router.push('/forgot')} />
      </View>

      <Pill title="Giriş yap" style={{ marginTop: 8 }} onPress={submit} />
      <Divider label="ya da" />
      <View style={{ gap: 10 }}>
        <Pill title="Google ile devam et" variant="secondary" />
        <Pill title="Facebook ile devam et" variant="secondary" />
      </View>

      <View style={{ marginTop: 'auto', paddingTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
        <Text style={[type.subhead, { color: colors.secondary }]}>Hesabın yok mu?</Text>
        <TextButton title="Hesap oluştur" weight="600" onPress={() => router.replace('/signup')} />
      </View>
    </Screen>
  );
}
