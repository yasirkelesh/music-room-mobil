import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import type { PlaylistSummary } from '@/api/types';
import { ListSleeve, NewListCard } from '@/components/ListSleeve';
import { FormError, IconButton, SectionHeader } from '@/components/ui';
import { useAsync } from '@/lib/useAsync';
import { colors, type } from '@/theme';
import { useTabInset } from '@/components/MiniPlayer';
import { readable, useContentWidth } from '@/lib/layout';

const GAP = 14;

function Grid({ items, size, onChanged }: { items: PlaylistSummary[]; size: number; onChanged?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: 22, marginTop: 4 }}>
      {items.map((p) => <ListSleeve key={p.playlistId} p={p} size={size} onChanged={onChanged} />)}
    </View>
  );
}

export default function Lists() {
  const tabInset = useTabInset();
  const width = useContentWidth();
  const size = Math.floor((width - 40 - GAP) / 2);
  const mine = useAsync(() => api.playlists.list('mine', { pageSize: 50 }));
  const shared = useAsync(() => api.playlists.list('shared', { pageSize: 50 }));
  const pub = useAsync(() => api.playlists.list('public', { pageSize: 20 }));
  useFocusEffect(useCallback(() => { mine.reload(); shared.reload(); pub.reload(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  const known = new Set([...(mine.data ?? []), ...(shared.data ?? [])].map((p) => p.playlistId));
  const discover = (pub.data ?? []).filter((p) => !known.has(p.playlistId));
  const error = mine.error ?? shared.error;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ ...readable, paddingHorizontal: 20, paddingBottom: tabInset }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
          <IconButton icon="plus" label="Yeni liste" filled size={36} iconSize={18} onPress={() => router.push('/list/new')} />
        </View>
        <Text accessibilityRole="header" style={type.largeTitle}>Listeler</Text>
        <Text style={[type.subhead, { color: colors.secondary, marginTop: 4 }]}>Plak dolapların. Rafa diz, pikapta çal, birlikte düzenle.</Text>
        {error ? <FormError message={describeError(error)} /> : null}

        {mine.data && mine.data.length === 0 ? <NewListCard /> : (
          <>
            <SectionHeader>Listelerin</SectionHeader>
            <Grid items={mine.data ?? []} size={size} onChanged={mine.reload} />
          </>
        )}

        {(shared.data?.length ?? 0) > 0 && (
          <>
            <SectionHeader icon="people">Seninle paylaşılan</SectionHeader>
            <Grid items={shared.data!} size={size} />
          </>
        )}

        {discover.length > 0 && (
          <>
            <SectionHeader icon="globe">Keşfet</SectionHeader>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: GAP }}>
              {discover.map((p) => <ListSleeve key={p.playlistId} p={p} size={Math.round(size * 0.78)} />)}
            </ScrollView>
          </>
        )}

        {(mine.data?.length ?? 0) > 0 && <NewListCard />}
      </ScrollView>
    </SafeAreaView>
  );
}
