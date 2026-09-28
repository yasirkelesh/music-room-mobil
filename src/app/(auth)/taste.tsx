import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Chip, Pill, Screen, Sub, TextButton, Title } from '@/components/ui';
import { genres } from '@/data/mock';
import { colors, type } from '@/theme';

export default function Taste() {
  const [picked, setPicked] = useState<string[]>(['Indie', 'Elektronik', 'Anadolu Rock']);
  const toggle = (g: string) => setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  const done = () => router.replace('/(tabs)');

  return (
    <Screen scroll>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel="Adım 2 / 3">
          {[0, 1, 2].map((i) => <View key={i} style={{ width: 24, height: 4, borderRadius: 2, backgroundColor: i < 2 ? colors.label : colors.track }} />)}
        </View>
        <TextButton title="Atla" muted onPress={done} />
      </View>

      <Title>Neler dinlersin?</Title>
      <Sub>En az 3 tür seç. Profilinde görünür, önerileri de buna göre ayarlarız.</Sub>

      <View style={{ marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {genres.map((g) => <Chip key={g} label={g} on={picked.includes(g)} onPress={() => toggle(g)} />)}
      </View>

      <View style={{ marginTop: 'auto', paddingTop: 24, gap: 10 }}>
        <Text style={[type.subhead, type.numeric, { color: colors.secondary, textAlign: 'center' }]}>{picked.length} seçildi</Text>
        <Pill title="Devam et" disabled={picked.length < 3} onPress={done} />
      </View>
    </Screen>
  );
}
