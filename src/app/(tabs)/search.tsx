import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cover } from '@/components/Cover';
import { Group, SearchField } from '@/components/ui';
import { covers, genres, tracks } from '@/data/mock';
import { usePlayer } from '@/state/player';
import { colors, TAB_INSET, type } from '@/theme';

const all = Object.values(tracks);
const tileCovers = Object.keys(covers) as (keyof typeof covers)[];

export default function Search() {
  const [q, setQ] = useState('');
  const { play } = usePlayer();
  const results = q ? all.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(q.toLowerCase())) : [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_INSET }} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[type.largeTitle, { marginTop: 44 }]}>Ara</Text>
        <View style={{ marginTop: 12 }}>
          <SearchField placeholder="Şarkı, sanatçı, kullanıcı" value={q} onChangeText={setQ} accessibilityLabel="Ara" />
        </View>

        {q ? (
          <Group style={{ marginTop: 16 }}>
            {results.map((t) => (
              <Pressable key={t.id} accessibilityRole="button" onPress={() => play(t.id)} style={{ height: 60, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Cover cover={t.cover} size={44} radius={6} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.callout, { fontWeight: '500' }]}>{t.title}</Text>
                  <Text style={[type.footnote, { color: colors.secondary }]}>{t.artist}</Text>
                </View>
              </Pressable>
            ))}
          </Group>
        ) : (
          <>
            <Text style={[type.title2, { marginTop: 24 }]}>Türlere göz at</Text>
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {genres.slice(0, 8).map((g, i) => {
                const c = covers[tileCovers[i % tileCovers.length]];
                return (
                  <Pressable key={g} accessibilityRole="button" style={{ width: '48.5%', height: 96, borderRadius: 12, backgroundColor: c.base, padding: 12, overflow: 'hidden' }}>
                    <Text style={[type.headline, { color: c.onBase }]}>{g}</Text>
                    <View style={{ position: 'absolute', right: -14, bottom: -14, transform: [{ rotate: '20deg' }] }}>
                      <Cover cover={tileCovers[i % tileCovers.length]} size={64} radius={6} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
