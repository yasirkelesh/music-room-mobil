import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Avatar } from '@/components/Avatar';
import { Cover } from '@/components/Cover';
import { Disc } from '@/components/Disc';
import { Icon } from '@/components/Icon';
import { Group, Pill, tap, TextButton } from '@/components/ui';
import { people, Person, tracks } from '@/data/mock';
import { usePlayer } from '@/state/player';
import { colors, TAB_INSET, type } from '@/theme';

const members: { person: Person; aux?: boolean }[] = [
  { person: people.me, aux: true },
  { person: people.elif },
  { person: people.mert },
  { person: people.deniz },
];

export default function Jam() {
  const { track, playing } = usePlayer();
  const [queue, setQueue] = useState([
    { id: 'moons', by: 'elif', votes: 2, mine: true },
    { id: 'slowmo', by: 'mert', votes: 2, mine: false },
    { id: 'dialup', by: 'deniz', votes: 0, mine: false },
  ]);
  const vote = (id: string) => {
    tap();
    setQueue((q) => q
      .map((x) => (x.id === id ? { ...x, mine: !x.mine, votes: x.votes + (x.mine ? -1 : 1) } : x))
      .sort((a, b) => b.votes - a.votes));
  };

  const R = 100;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_INSET }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextButton title="Parti yap" onPress={() => router.push('/party/rules')} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={[type.footnote, { color: colors.secondary }]}>kod</Text>
            <Text style={[type.headline, type.numeric]}>K7·42X</Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={[type.hero, { fontSize: 40, marginTop: 12 }]}>Yasir’in odası</Text>
        <Text style={[type.subhead, { color: colors.secondary, marginTop: 6 }]}>4 kişi · aux sende</Text>

        {/* the room: members sit on a ring around what's playing */}
        <View style={{ height: 250, marginTop: 16, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: R * 2, height: R * 2, borderRadius: R, borderWidth: 1, borderColor: colors.track }} />
          <Disc cover={track.cover} size={80} finish="picture" spinning={playing} />
          {members.map((m, i) => {
            const a = (i / members.length) * Math.PI * 2 - Math.PI / 2;
            const left = Math.cos(a) * R;
            const top = Math.sin(a) * R;
            return (
              <View key={m.person.id} style={{ position: 'absolute', transform: [{ translateX: left }, { translateY: top }], alignItems: 'center' }}>
                <Avatar person={m.person} size={40} override={m.aux ? { bg: colors.label, fg: colors.white } : undefined} ring={m.aux ? colors.bg : undefined} />
                <Text style={[type.caption, { color: m.aux ? colors.label : colors.secondary, fontWeight: m.aux ? '600' : '400', position: 'absolute', top: 44, width: 60, textAlign: 'center' }]}>
                  {m.aux ? 'sen · AUX' : m.person.name.toLowerCase()}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[type.footnote, { color: colors.secondary }]}>Sıradakiler</Text>
          <Text style={[type.footnote, { color: colors.secondary }]}>oylar</Text>
        </View>
        <Group style={{ marginTop: 6 }}>
          {queue.map((q) => {
            const t = tracks[q.id];
            return (
              <Animated.View key={q.id} layout={LinearTransition.springify().damping(18)} style={{ height: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Cover cover={t.cover} size={44} radius={6} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.callout, { fontWeight: '500' }]}>{t.title}</Text>
                  <Text style={[type.footnote, { color: colors.secondary }]}>{t.artist} · {q.by}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: q.mine }} accessibilityLabel={`${t.title} için oy ver`} onPress={() => vote(q.id)} style={{ minWidth: 52, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <Icon name="up" size={12} color={q.mine ? colors.label : colors.disabled} />
                  <Text style={[type.callout, type.numeric, { fontWeight: '600' }]}>{q.votes}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </Group>

        <View style={{ marginTop: 20, flexDirection: 'row', gap: 10 }}>
          <Pill title="Şarkı ekle" variant="outline" style={{ flex: 1 }} />
          <Pill title="Aux’u devret" style={{ flex: 1 }} onPress={() => router.push('/room/handover')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
