import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { Icon } from '@/components/Icon';
import { FieldRow, FormError, Group, Pill, Screen, Sub, TextButton, Title, TopBar } from '@/components/ui';
import { colors, type } from '@/theme';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.auth.requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <TopBar />
      <Title>Şifreni mi unuttun?</Title>
      <Sub>E-posta adresini yaz, yeni şifre belirlemen için bir bağlantı gönderelim.</Sub>

      <Group style={{ marginTop: 28 }}>
        <FieldRow label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
      </Group>

      {sent && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: 14, padding: 16, flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={14} color={colors.white} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.callout, { fontWeight: '600' }]}>İstek alındı</Text>
            <Text style={[type.subhead, { color: colors.secondary, lineHeight: 20 }]}>Bu adres kayıtlıysa bir bağlantı gönderdik. Bağlantı 1 saat geçerli.</Text>
          </View>
        </Animated.View>
      )}

      <FormError message={error} />
      <Pill title={busy ? 'Gönderiliyor…' : sent ? 'Tekrar gönder' : 'Sıfırlama bağlantısı gönder'} disabled={busy || !email.includes('@')} style={{ marginTop: 24 }} onPress={submit} />
      {sent && <View style={{ alignItems: 'center', marginTop: 4 }}><TextButton title="Kodum var" onPress={() => router.push('/reset')} /></View>}

      <View style={{ marginTop: 'auto', paddingTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
        <Text style={[type.subhead, { color: colors.secondary }]}>Hatırladın mı?</Text>
        <TextButton title="Giriş yap" weight="600" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
