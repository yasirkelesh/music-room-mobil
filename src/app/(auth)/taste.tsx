import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { Chip, FormError, Pill, Screen, Sub, TextButton, Title } from '@/components/ui';
import { genres } from '@/data/mock';
import { useAuth } from '@/state/auth';
import { colors, type } from '@/theme';

export default function Taste() {
  const { me, reloadMe } = useAuth();
  const [picked, setPicked] = useState<string[]>(me?.genres ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (g: string) => setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  const enter = () => router.replace('/(tabs)');

  const done = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.me.setMusicPreferences({ genres: picked, artists: me?.artists ?? [] });
      await reloadMe();
      enter();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
        <TextButton title="Atla" muted onPress={enter} />
      </View>

      <Title>Neler dinlersin?</Title>
      <Sub>En az 3 tür seç. Önerileri buna göre ayarlarız; profilinde sadece sen görürsün.</Sub>

      <View style={{ marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {genres.map((g) => <Chip key={g} label={g} on={picked.includes(g)} onPress={() => toggle(g)} />)}
      </View>

      <View style={{ marginTop: 'auto', paddingTop: 24, gap: 10 }}>
        <FormError message={error} style={{ textAlign: 'center', marginTop: 0 }} />
        <Text style={[type.subhead, type.numeric, { color: colors.secondary, textAlign: 'center' }]}>{picked.length} seçildi</Text>
        <Pill title={busy ? 'Kaydediliyor…' : 'Devam et'} disabled={picked.length < 3 || busy} onPress={done} />
      </View>
    </Screen>
  );
}
