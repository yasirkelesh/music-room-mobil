import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { Avatar } from '@/components/Avatar';
import { Cover } from '@/components/Cover';
import { Icon } from '@/components/Icon';
import { Group, IconButton, Pill, Screen, SearchField, SectionHeader, Title, TopBar } from '@/components/ui';
import { CoverKey, people, Person } from '@/data/mock';
import { colors, type } from '@/theme';

type Friend = { person: Person; sub: string; cover?: CoverKey };

export default function Friends() {
  const [query, setQuery] = useState('');
  const [requests, setRequests] = useState([
    { person: people.burak, sub: '@burak · 2 ortak arkadaş' },
    { person: people.selin, sub: '@selin · Café Bant’ta tanıştınız' },
  ]);
  const [friends, setFriends] = useState<Friend[]>([
    { person: people.elif, sub: 'Dinliyor · Paper Moons', cover: 'moons' },
    { person: people.mert, sub: 'Dinliyor · Dial-up Heart', cover: 'dialup' },
    { person: people.deniz, sub: '2 saat önce aktifti' },
    { person: people.kaan, sub: 'Bant’ta Cuma partisinde', cover: 'slowmo' },
  ]);

  const accept = (p: Person) => {
    setRequests((r) => r.filter((x) => x.person.id !== p.id));
    setFriends((f) => [{ person: p, sub: 'Yeni arkadaşın' }, ...f]);
  };
  const decline = (p: Person) => setRequests((r) => r.filter((x) => x.person.id !== p.id));
  const shown = friends.filter((f) => f.person.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Screen scroll>
      <TopBar right={<IconButton icon="share" label="Davet bağlantısı paylaş" />} />
      <Title style={{ marginTop: 8 }}>Arkadaşlar</Title>
      <View style={{ marginTop: 14 }}>
        <SearchField placeholder="Kullanıcı adıyla ara" value={query} onChangeText={setQuery} autoCapitalize="none" accessibilityLabel="Kullanıcı ara" />
      </View>

      {requests.length > 0 && (
        <>
          <SectionHeader>{`İstekler · ${requests.length}`}</SectionHeader>
          <Group>
            {requests.map((r) => (
              <Animated.View key={r.person.id} exiting={FadeOut} layout={LinearTransition} style={{ height: 60, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar person={r.person} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.callout, { fontWeight: '500' }]}>{r.person.name}</Text>
                  <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{r.sub}</Text>
                </View>
                <Pill title="Kabul et" height={32} style={{ paddingHorizontal: 14 }} onPress={() => accept(r.person)} />
                <Pressable accessibilityRole="button" accessibilityLabel={`${r.person.name} isteğini reddet`} onPress={() => decline(r.person)} hitSlop={8} style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={14} color={colors.tertiary} />
                </Pressable>
              </Animated.View>
            ))}
          </Group>
        </>
      )}

      <SectionHeader>{`Arkadaşların · ${8 + friends.length}`}</SectionHeader>
      <Group>
        {shown.map((f) => (
          <Animated.View key={f.person.id} layout={LinearTransition} style={{ height: 60, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar person={f.person} />
            <View style={{ flex: 1 }}>
              <Text style={[type.callout, { fontWeight: '500' }]}>{f.person.name}</Text>
              <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{f.sub}</Text>
            </View>
            {f.cover && <Cover cover={f.cover} size={32} radius={5} />}
          </Animated.View>
        ))}
      </Group>
    </Screen>
  );
}
