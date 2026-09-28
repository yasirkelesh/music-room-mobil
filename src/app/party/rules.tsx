import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Group, Pill, Radio, Screen, SectionHeader, tap, TextButton } from '@/components/ui';
import { people } from '@/data/mock';
import { colors, type } from '@/theme';

/**
 * V.2.1 visibility + licence for an event:
 *  - visibility: public (default) or private (only invited can find it)
 *  - licence: everyone (default), invited only, or people at a place during set hours
 */
type Vis = 'public' | 'private';
type Lic = 'everyone' | 'invited' | 'place';
const hh = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`;

function Option({ title, sub, on, onPress }: { title: string; sub: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); onPress(); }} style={{ height: 60, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ flex: 1 }}>
        <Text style={[type.callout, { fontWeight: '500' }]}>{title}</Text>
        <Text style={[type.footnote, { color: colors.secondary }]}>{sub}</Text>
      </View>
      <Radio on={on} />
    </Pressable>
  );
}

function Stepper({ value, onDown, onUp, what }: { value: number; onDown: () => void; onUp: () => void; what: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${what} bir saat öne al`} onPress={() => { tap(); onDown(); }} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>−</Text></Pressable>
      <Text style={[type.numeric, { fontSize: 26, fontWeight: '600' }]}>{hh(value)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${what} bir saat ileri al`} onPress={() => { tap(); onUp(); }} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>+</Text></Pressable>
    </View>
  );
}

export default function Rules() {
  const [name, setName] = useState('Bant’ta Cuma');
  const [vis, setVis] = useState<Vis>('public');
  const [lic, setLic] = useState<Lic>('place');
  const [from, setFrom] = useState(16);
  const [to, setTo] = useState(18);

  const seen = vis === 'public' ? 'Yakındaki herkes bu partiyi bulabilir' : 'Bu partiyi sadece davetliler bulabilir';
  const who = lic === 'everyone' ? 'bulabilen herkes' : lic === 'invited' ? 'davetliler' : `${hh(from)}–${hh(to)} arası Café Bant’ta olanlar`;

  return (
    <Screen scroll>
      <StatusBar style="dark" />
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextButton title="Vazgeç" onPress={() => router.back()} />
        <Text style={[type.subhead, { fontWeight: '600' }]}>YENİ PARTİ</Text>
      </View>

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 8 }]}>Ad</Text>
      <TextInput accessibilityLabel="Parti adı" value={name} onChangeText={setName} style={{ fontSize: 32, fontWeight: '700', color: colors.label, height: 48, borderBottomWidth: 1, borderBottomColor: colors.label, marginTop: 4 }} />

      <SectionHeader>Kimler bulabilir</SectionHeader>
      <Group>
        <Option title="Herkese açık" sub="Yakındaki herkes bulabilir" on={vis === 'public'} onPress={() => setVis('public')} />
        <Option title="Özel" sub="Sadece davet ettiklerin görür" on={vis === 'private'} onPress={() => setVis('private')} />
      </Group>

      <SectionHeader>Kimler oy verebilir</SectionHeader>
      <Group>
        <Option title="Herkes" sub="Bulabilen herkes" on={lic === 'everyone'} onPress={() => setLic('everyone')} />
        <Option title="Sadece davetliler" sub="Davetliler oylar, diğerleri dinler" on={lic === 'invited'} onPress={() => setLic('invited')} />
        <Option title="Burada, belirli saatlerde" sub="Sadece o saatte mekânda olanlar" on={lic === 'place'} onPress={() => setLic('place')} />
      </Group>

      {lic === 'place' && (
        <View style={{ marginTop: 14, borderRadius: 20, backgroundColor: colors.card, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="pin" size={16} />
            <Text style={[type.subhead, { flex: 1 }]}>Café Bant, 200 m çevresi</Text>
            <TextButton title="Değiştir" size={13} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stepper what="Başlangıcı" value={from} onDown={() => setFrom((f) => f - 1)} onUp={() => setFrom((f) => (f + 1 < to ? f + 1 : f))} />
            <Text style={[type.footnote, { color: colors.secondary }]}>ile</Text>
            <Stepper what="Bitişi" value={to} onDown={() => setTo((t) => (t - 1 > from ? t - 1 : t))} onUp={() => setTo((t) => t + 1)} />
          </View>
        </View>
      )}

      {(vis === 'private' || lic === 'invited') && (
        <View style={{ marginTop: 14, height: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            {[people.elif, people.mert, people.selin].map((p, i) => <View key={p.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar person={p} size={34} ring={colors.bg} /></View>)}
          </View>
          <Text style={[type.subhead, { flex: 1, color: colors.secondary }]}>3 davetli</Text>
          <TextButton title="Davet et +" />
        </View>
      )}

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 24, lineHeight: 18 }]}>{seen}. Oy verebilenler: {who}.</Text>
      {/* TODO: api.createEvent({ name, visibility: vis, licence: lic, window: { from, to } }) */}
      <Pill title="Partiyi başlat" style={{ marginTop: 12 }} left={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} />} onPress={() => router.replace('/party')} />
    </Screen>
  );
}
