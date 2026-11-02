import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { PlaylistSummary, Visibility } from '@/api/types';
import { thumbnail, useTracks } from '@/lib/tracks';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/state/auth';
import { usePlayer } from '@/state/player';
import { colors, type } from '@/theme';
import { Mosaic } from './Cover';
import { Disc } from './Disc';
import { Icon } from './Icon';
import { PlayingBars } from './Party';
import { Action, showActions } from './ActionSheet';

/** Fisher–Yates; outside components so render stays pure. */
export function shuffled<T>(xs: T[]): T[] {
  const s = [...xs];
  for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
  return s;
}

const open = (p: PlaylistSummary) => router.push({ pathname: '/list/[id]', params: { id: p.playlistId } });

/**
 * A sleeve with its record half out: the cover is the list, the record plays it without opening it.
 * The record spins while this list is the one playing.
 */
export function ListSleeve({ p, size, onChanged }: { p: PlaylistSummary; size: number; onChanged?: () => void }) {
  const player = usePlayer();
  const { userId } = useAuth();
  const tracks = useAsync(() => api.playlists.allTracks(p.playlistId), [p.playlistId]);
  const ids = (tracks.data?.tracks ?? []).map((t) => t.youtubeVideoId);
  const meta = useTracks(ids);
  const source = `playlist:${p.playlistId}`;
  const fromHere = player.source === source && !!player.track;
  const playingHere = fromHere && player.playing;
  const sleeve = Math.round(size * 0.8);
  const disc = Math.round(sleeve * 0.94);
  const out = size - sleeve; // how much of the record shows

  const play = () => {
    if (!ids.length) return open(p);
    Haptics.selectionAsync().catch(() => {});
    if (fromHere) player.toggle();
    else player.playList(ids.map((v) => meta[v]), 0, p.name, source);
  };

  const menu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const items: Action[] = [{ label: 'Aç', icon: 'arrow', run: () => open(p) }];
    if (ids.length) {
      items.push({ label: fromHere && player.playing ? 'Duraklat' : 'Çal', icon: fromHere && player.playing ? 'pause' : 'play', run: play });
      if (ids.length > 1) items.push({ label: 'Karıştırarak çal', icon: 'shuffle', run: () => player.playList(shuffled(ids.map((v) => meta[v])), 0, p.name, source) });
    }
    if (userId && p.ownerId === userId) items.push({
      label: 'Listeyi sil', icon: 'close', destructive: true,
      run: () => Alert.alert('Listeyi sil', `“${p.name}” silinsin mi? Bu geri alınamaz.`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: async () => {
          if (fromHere) player.stop();
          try { await api.playlists.remove(p.playlistId); onChanged?.(); } catch (e) { Alert.alert('Silinemedi', describeError(e)); }
        } },
      ]),
    });
    showActions({ title: p.name, subtitle: `${ids.length} plak`, cover: ids.length ? meta[ids[0]].cover : undefined }, items);
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${p.name}, ${ids.length} plak`} accessibilityHint="Açmak için dokun, seçenekler için basılı tut"
      onPress={() => open(p)} onLongPress={menu} delayLongPress={350} style={({ pressed }) => ({ width: size, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ width: size, height: sleeve }}>
        {/* the record, behind the sleeve, sliding out to the right */}
        {ids.length > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: (sleeve - disc) / 2 }}>
            <Disc cover={fromHere && player.track ? player.track.cover : meta[ids[0]].cover} size={disc} finish="vinyl" label={0.4} spinning={playingHere && !player.buffering} duration={2400} holeColor={colors.bg} />
          </View>
        )}
        <View style={{ borderRadius: 6, shadowColor: colors.black, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 2, height: 4 } }}>
          {ids.length
            ? <Mosaic items={ids.slice(0, 4).map((v) => ({ uri: thumbnail(v) }))} size={sleeve} radius={6} />
            : <View style={{ width: sleeve, height: sleeve, borderRadius: 6, backgroundColor: colors.chromeLight, alignItems: 'center', justifyContent: 'center' }}><Icon name="lists" size={32} color={colors.tertiary} /></View>}
        </View>
        {/* play button sits on the visible strip of the record */}
        {ids.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel={playingHere ? `${p.name} duraklat` : `${p.name} çal`} onPress={play} hitSlop={8}
            style={({ pressed }) => ({
              position: 'absolute', right: Math.max(2, (out - 32) / 2), top: sleeve / 2 - 16, width: 32, height: 32, borderRadius: 16,
              backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.9 : 1 }],
              shadowColor: colors.black, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
            })}>
            {playingHere ? <PlayingBars playing color={colors.black} size={12} /> : <Icon name="play" size={12} color={colors.black} />}
          </Pressable>
        )}
      </View>
      <Text style={[type.subhead, { fontWeight: '600', marginTop: 10 }]} numberOfLines={1}>{p.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
        {p.visibility === Visibility.Private && <Icon name="lock" size={11} color={colors.secondary} strokeWidth={2} />}
        <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{tracks.data ? `${ids.length} plak` : ' '}</Text>
      </View>
    </Pressable>
  );
}

/** An empty sleeve with a plus: start a new record cabinet. */
export function NewSleeve({ size }: { size: number }) {
  const sleeve = Math.round(size * 0.8);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Yeni liste" onPress={() => router.push('/list/new')} style={({ pressed }) => ({ width: size, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: sleeve, height: sleeve, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={20} color={colors.white} strokeWidth={2.4} />
        </View>
      </View>
      <Text style={[type.subhead, { fontWeight: '600', marginTop: 10 }]}>Yeni liste</Text>
      <Text style={[type.footnote, { color: colors.secondary }]}>Plak dolabı kur</Text>
    </Pressable>
  );
}

export function NewListCard() {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/list/new')}
      style={({ pressed }) => ({ marginTop: 24, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.separator, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={22} color={colors.white} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.headline}>Yeni liste</Text>
        <Text style={[type.footnote, { color: colors.secondary, marginTop: 2, lineHeight: 18 }]}>Yeni bir plak dolabı: plaklarını seç, rafa diz, pikapta çal.</Text>
      </View>
    </Pressable>
  );
}

