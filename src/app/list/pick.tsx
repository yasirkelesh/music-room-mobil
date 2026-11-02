import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { Icon } from '@/components/Icon';
import { FormError, Group, Screen, Title, TopBar } from '@/components/ui';
import { Mosaic } from '@/components/Cover';
import { thumbnail, useTracks } from '@/lib/tracks';
import { useAsync } from '@/lib/useAsync';
import { colors, type } from '@/theme';

/** "Add to list": choose which of your playlists receives the track. */
export default function PickList() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const track = useTracks([videoId])[videoId];
  const mine = useAsync(() => api.playlists.list('mine', { pageSize: 50 }));
  const shared = useAsync(() => api.playlists.list('shared', { pageSize: 50 }));
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async (playlistId: string) => {
    setBusy(playlistId);
    setError(null);
    try {
      for (let attempt = 0; ; attempt++) {
        const { etag } = await api.playlists.allTracks(playlistId);
        try {
          await api.playlists.addTrack(playlistId, { youtubeVideoId: videoId }, etag ?? '');
          break;
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 412 && attempt === 0)) throw e;
        }
      }
      setDone(playlistId);
      setTimeout(() => router.back(), 600);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'Bu listeye plak ekleme iznin yok.' : e instanceof ApiError && e.status === 409 ? 'Liste dolu.' : describeError(e));
    } finally {
      setBusy(null);
    }
  };

  const lists = [...(mine.data ?? []), ...(shared.data ?? [])];
  return (
    <Screen scroll>
      <TopBar />
      <Title style={{ marginTop: 8 }}>Dolabına ekle</Title>
      <Text style={[type.subhead, { color: colors.secondary, marginTop: 6 }]} numberOfLines={2}>{track.title === '…' ? ' ' : `“${track.title}”`}</Text>
      <FormError message={error ?? (mine.error ? describeError(mine.error) : null)} />
      <Group style={{ marginTop: 20 }}>
        {!mine.loading && lists.length === 0 && <Text style={[type.subhead, { color: colors.secondary, paddingVertical: 16 }]}>Henüz listen yok. Listeler sekmesinden bir tane oluştur.</Text>}
        {lists.map((p) => (
          <Pressable key={p.playlistId} accessibilityRole="button" disabled={!!busy || !!done} onPress={() => add(p.playlistId)} style={{ height: 64, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: busy && busy !== p.playlistId ? 0.4 : 1 }}>
            <SleeveThumb id={p.playlistId} />
            <Text style={[type.body, { flex: 1, fontWeight: '500' }]} numberOfLines={1}>{p.name}</Text>
            {done === p.playlistId ? <Icon name="check" size={18} /> : <View style={{ width: 18 }}><Icon name="plus" size={16} color={colors.secondary} /></View>}
          </Pressable>
        ))}
      </Group>
    </Screen>
  );
}

/** A small sleeve: the cabinet's cover, so lists are told apart at a glance. */
function SleeveThumb({ id }: { id: string }) {
  const t = useAsync(() => api.playlists.allTracks(id), [id]);
  const ids = (t.data?.tracks ?? []).map((x) => x.youtubeVideoId);
  return ids.length
    ? <Mosaic items={ids.slice(0, 4).map((v) => ({ uri: thumbnail(v) }))} size={44} radius={4} />
    : <View style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: colors.chromeLight, alignItems: 'center', justifyContent: 'center' }}><Icon name="lists" size={18} color={colors.tertiary} /></View>;
}
