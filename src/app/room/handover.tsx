import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { Check, Choice, Group, Pill, Screen, Sub, tap, Title, Toggle, TopBar } from '@/components/ui';
import { people, Person } from '@/data/mock';
import { colors, type } from '@/theme';

/**
 * V.2.2 Music Control Delegation.
 * The licence is per device attached to the account: each device has its own list
 * of friends who may control it (api.setDeviceDelegates).
 */
type DeviceId = 'phone' | 'laptop' | 'speaker';
const devices: { id: DeviceId; name: string; icon: IconName }[] = [
  { id: 'phone', name: 'iPhone', icon: 'phone' },
  { id: 'laptop', name: 'MacBook', icon: 'laptop' },
  { id: 'speaker', name: 'Hoparlör', icon: 'speaker' },
];
const friends: Person[] = [people.elif, people.mert, people.deniz];
type Span = 'song' | 'tonight' | 'untilI';

export default function Handover() {
  const [device, setDevice] = useState<DeviceId>('speaker');
  const [access, setAccess] = useState<Record<DeviceId, string[]>>({ phone: [], laptop: [], speaker: ['elif', 'mert'] });
  const [canPick, setCanPick] = useState(true);
  const [canSkip, setCanSkip] = useState(true);
  const [span, setSpan] = useState<Span>('untilI');

  const cur = access[device];
  const name = (id: string) => people[id].name;
  const summary = (ids: string[]) => (ids.length === 0 ? 'Sadece sen' : ids.length === 1 ? name(ids[0]) : `${name(ids[0])} +${ids.length - 1}`);
  const toggle = (id: string) => {
    tap();
    setAccess((a) => ({ ...a, [device]: a[device].includes(id) ? a[device].filter((x) => x !== id) : [...a[device], id] }));
  };
  const devName = devices.find((d) => d.id === device)!.name;
  const cta = cur.length === 0 ? `${devName} sadece bende kalsın` : `${devName} kontrolünü ${cur.map(name).join(' ve ')} ile paylaş`;

  return (
    <Screen scroll>
      <TopBar />
      <Title>Aux’u devret</Title>
      <Sub>Her cihazının kendi kuralları var.</Sub>

      <View style={{ marginTop: 22, flexDirection: 'row', gap: 8 }}>
        {devices.map((d) => {
          const on = d.id === device;
          const fg = on ? colors.white : colors.label;
          return (
            <Pressable key={d.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { tap(); setDevice(d.id); }} style={{ flex: 1, height: 96, borderRadius: 18, padding: 12, backgroundColor: on ? colors.label : colors.card, justifyContent: 'space-between' }}>
              <Icon name={d.icon} color={fg} size={20} strokeWidth={1.6} />
              <View>
                <Text style={[type.subhead, { fontWeight: '600', color: fg }]}>{d.name}</Text>
                <Text style={[type.caption, { color: fg, opacity: 0.7 }]} numberOfLines={1}>{summary(access[d.id])}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 24, marginBottom: 6, marginHorizontal: 16 }]}>{devName.toUpperCase()} KONTROLÜ KİMLERDE</Text>
      <Group>
        {friends.map((f) => {
          const on = cur.includes(f.id);
          return (
            <Pressable key={f.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(f.id)} style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar person={f} size={36} />
              <Text style={[type.body, { flex: 1, fontWeight: '500' }]}>{f.name}</Text>
              <Check on={on} round />
            </Pressable>
          );
        })}
      </Group>

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 24, marginBottom: 6, marginHorizontal: 16 }]}>YAPABİLECEKLERİ</Text>
      <Group>
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={type.body}>Şarkı seçip sıraya eklemek</Text>
          <Toggle value={canPick} onChange={setCanPick} label="Şarkı seçip sıraya eklemek" />
        </View>
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={type.body}>Çalmak, duraklatmak, geçmek</Text>
          <Toggle value={canSkip} onChange={setCanSkip} label="Çalmak, duraklatmak, geçmek" />
        </View>
      </Group>

      <View style={{ marginTop: 16, paddingHorizontal: 4 }}>
        <Choice value={span} onChange={setSpan} options={[{ value: 'song', label: 'Bir şarkı' }, { value: 'tonight', label: 'Bu gece' }, { value: 'untilI', label: 'Ben diyene kadar' }]} />
      </View>

      {/* TODO: api.setDeviceDelegates(device, cur) */}
      <Pill title={cta} style={{ marginTop: 28 }} left={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} />} />
    </Screen>
  );
}
