import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { describeError } from '@/api/errors';
import { LicenceMode, Visibility } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Cover } from '@/components/Cover';
import { SeekRow, Shelf, ShelfItem, Turntable } from '@/components/Jukebox';
import { FLOATING_PLAYER_INSET, FloatingMiniPlayer } from '@/components/MiniPlayer';
import { PlayingBars } from '@/components/Party';
import { FormError, IconButton, Pill, Screen, TextButton, TopBar } from '@/components/ui';
import { formatTime, slotCode, Track } from '@/data/mock';
import { personOf } from '@/lib/people';
import { useTracks } from '@/lib/tracks';
import { usePlaylist } from '@/lib/usePlaylist';
import { useAuth } from '@/state/auth';
import { usePlayer } from '@/state/player';
import { colors, type } from '@/theme';
import { Action, showActions } from '@/components/ActionSheet';

const PAGE = 10; // slots on the shelf: A1…A5, B1…B5

/** Fisher–Yates; outside the component so render stays pure. */
function shuffled<T>(xs: T[]): T[] {
  const s = [...xs];
  for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
  return s;
}

const totalTime = (s: number) => {
  if (s <= 0) return null;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} sa ${m} dk` : `${m} dk`;
};

const ago = (at: number, now: number) => {
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 5 ? 'ŞİMDİ' : s < 60 ? `${s}SN` : s < 3600 ? `${Math.floor(s / 60)}DK` : `${Math.floor(s / 3600)}SA`;
};

/**
 * The record cabinet (V.2.3). The deck plays; the shelf holds the list. Tap a record to put it on the deck.
 * In edit mode you pick a record up instead and slide it along the shelf. Several people can edit at
 * once: every write carries the ETag of the last read, so when two reorder together exactly one wins
 * and the other is told and reloaded (usePlaylist).
 */
export default function Cabinet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const pl = usePlaylist(id);
  const player = usePlayer();
  const [editing, setEditing] = useState(false);
  const [held, setHeld] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const ids = pl.tracks.map((t) => t.youtubeVideoId);
  const meta = useTracks([...ids, ...pl.log.flatMap((l) => (l.videoId ? [l.videoId] : []))]);
  const items: ShelfItem[] = pl.tracks.map((t) => ({ id: t.playlistTrackId, track: meta[t.youtubeVideoId] }));

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  // Back from "Plak ekle": our own writes are not echoed by the hub, so re-read.
  useFocusEffect(useCallback(() => { pl.reload(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  if (pl.loading && !pl.playlist) return <Screen><TopBar /></Screen>;
  if (!pl.playlist) {
    return (
      <Screen>
        <TopBar />
        <FormError message={pl.error ? describeError(pl.error) : 'Liste bulunamadı.'} />
      </Screen>
    );
  }

  const p = pl.playlist;
  const mayEdit = p.mayEdit;
  const isOwner = !!userId && p.ownerId === userId;
  const source = `playlist:${id}`;
  const fromHere = player.source === source && !!player.track;
  const tracks = items.map((x) => x.track);

  // The record on the deck is the one playing from this list; its slot on the shelf stands empty.
  const deckIndex = fromHere ? items.findIndex((x) => x.track.id === player.track?.id) : -1;
  const deck = deckIndex >= 0 ? items[deckIndex] : undefined;
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const visible = items.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const heldIndex = items.findIndex((x) => x.id === held);
  const heldItem = heldIndex >= 0 ? items[heldIndex] : undefined;
  const seconds = items.reduce((n, x) => n + (x.track.duration || 0), 0);

  const playFrom = (i: number) => player.playList(tracks, i, p.name, source);

  const pick = (it: ShelfItem) => {
    const i = items.findIndex((x) => x.id === it.id);
    if (editing) {
      setHeld(it.id);
      pl.setNotice(null);
      return;
    }
    playFrom(i);
  };

  const moveAt = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    const neighbour = items[j].id;
    // Optimistic: show the swap now; usePlaylist re-reads (and corrects it) once the server answers.
    const next = pl.tracks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    pl.setTracks(next);
    setPage(Math.floor(j / PAGE));
    Haptics.selectionAsync().catch(() => {});
    const ok = await pl.move(items[i].id, dir < 0 ? { beforeTrackId: neighbour } : { afterTrackId: neighbour });
    if (!ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  };
  const move = (dir: -1 | 1) => moveAt(heldIndex, dir);

  const removeAt = (i: number) => Alert.alert('Plağı çıkar', `“${items[i].track.title}” listeden çıkarılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Çıkar', style: 'destructive', onPress: () => pl.remove(items[i].id) },
  ]);

  const rowMenu = (i: number, t: Track) => {
    const opts: Action[] = [{ label: 'Buradan çal', icon: 'play', run: () => playFrom(i) }];
    if (mayEdit && i > 0) opts.push({ label: 'Yukarı taşı', icon: 'up', run: () => moveAt(i, -1) });
    if (mayEdit && i < items.length - 1) opts.push({ label: 'Aşağı taşı', icon: 'downTri', run: () => moveAt(i, 1) });
    if (mayEdit) opts.push({ label: 'Listeden çıkar', icon: 'close', destructive: true, run: () => removeAt(i) });
    showActions({ title: t.title, subtitle: t.artist, cover: t.cover }, opts);
  };

  const removeHeld = () => {
    if (!heldItem) return;
    Alert.alert('Plağı çıkar', `“${heldItem.track.title}” raftan çıkarılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkar', style: 'destructive', onPress: async () => { if (await pl.remove(heldItem.id)) setHeld(undefined); } },
    ]);
  };

  const toggle = () => (fromHere ? player.toggle() : items.length ? playFrom(0) : undefined);
  const rule = [
    p.visibility === Visibility.Public ? 'Herkese açık' : 'Özel',
    p.licence === LicenceMode.Everyone ? 'herkes düzenleyebilir' : 'davetliler düzenleyebilir',
    `${items.length} plak`,
    totalTime(seconds),
  ].filter(Boolean).join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Screen scroll>
      <TopBar
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {pl.collaborators.length > 0 && (
              <View style={{ flexDirection: 'row', marginRight: 4 }}>
                {pl.collaborators.slice(0, 3).map((c, i) => (
                  <View key={c.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar person={personOf(c.displayName, c.userId)} size={30} ring={colors.bg} /></View>
                ))}
              </View>
            )}
            {isOwner && <IconButton icon="settings" label="Liste ayarları" onPress={() => router.push({ pathname: '/list/settings', params: { id } })} />}
          </View>
        }
      />

      <Text accessibilityRole="header" style={[type.largeTitle, { marginTop: 8 }]} numberOfLines={2}>{p.name}</Text>
      <Text style={[type.footnote, { color: colors.secondary, marginTop: 2 }]}>{rule}</Text>

      <View style={{ marginTop: 14 }}>
        <Turntable
          record={deck?.track}
          code={deckIndex >= 0 ? slotCode(deckIndex % PAGE) : undefined}
          playing={fromHere && player.playing}
          spinning={fromHere && player.playing && !player.buffering}
          onToggle={toggle}
          onNext={fromHere ? player.next : undefined}
          onPrev={fromHere ? player.prev : undefined}
          empty={items.length ? 'Raftan bir plak seç ya da çal’a bas' : 'Raf boş'}
        />
      </View>

      {fromHere && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <SeekRow />
          {player.queue[0] && (
            <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>Sıradaki · <Text style={{ color: colors.label, fontWeight: '600' }}>{player.queue[0].title}</Text></Text>
          )}
        </View>
      )}

      <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={[type.footnote, { color: colors.secondary }]}>
          {editing ? 'Raf · taşımak için bir plağı eline al' : 'Raf · çalmak için bir plağa dokun'}
        </Text>
        <Text style={[type.subhead, type.numeric, { fontWeight: '600' }]}>{String(items.length).padStart(2, '0')}</Text>
      </View>
      <View style={{ marginTop: 4 }}>
        <Shelf items={visible} deckId={editing ? undefined : deck?.id} mineId={editing ? held : undefined} onPick={pick} />
      </View>
      {pages > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 4 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Önceki raf" disabled={safePage === 0} onPress={() => setPage(safePage - 1)} hitSlop={8} style={{ opacity: safePage === 0 ? 0.3 : 1, height: 44, justifyContent: 'center' }}><Icon name="left" size={16} /></Pressable>
          <Text style={[type.subhead, type.numeric]}>Raf {safePage + 1} / {pages}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Sonraki raf" disabled={safePage >= pages - 1} onPress={() => setPage(safePage + 1)} hitSlop={8} style={{ opacity: safePage >= pages - 1 ? 0.3 : 1, height: 44, justifyContent: 'center' }}><Icon name="right" size={16} /></Pressable>
        </View>
      )}

      {/* the record in your hand */}
      {editing && (
        <View style={{ marginTop: 12, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {heldItem ? (
            <>
              <Text style={[type.title2, type.numeric, { width: 36, fontWeight: '600' }]}>{slotCode(heldIndex % PAGE)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[type.subhead, { fontWeight: '600' }]} numberOfLines={1}>{heldItem.track.title}</Text>
                <Text style={[type.caption, { color: colors.secondary }]}>elinde</Text>
              </View>
              <Round icon="left" label="Sola taşı" onPress={() => move(-1)} disabled={heldIndex <= 0} />
              <Round icon="right" label="Sağa taşı" onPress={() => move(1)} disabled={heldIndex >= items.length - 1} />
              <Round icon="close" label="Raftan çıkar" onPress={removeHeld} />
            </>
          ) : (
            <Text style={[type.subhead, { color: colors.secondary }]}>Taşımak ya da çıkarmak için raftan bir plağa dokun.</Text>
          )}
        </View>
      )}

      {pl.notice && (
        <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut} style={{ marginTop: 10, borderRadius: 18, backgroundColor: colors.label, paddingVertical: 12, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} />
          <Text style={[type.subhead, { flex: 1, color: colors.white, lineHeight: 20 }]}>{pl.notice}</Text>
          <TextButton title="Tamam" dark onPress={() => pl.setNotice(null)} />
        </Animated.View>
      )}

      <View style={{ marginTop: 20, gap: 10 }}>
        {mayEdit && <Pill title="Plak ekle" left={<Icon name="plus" size={16} color={colors.white} strokeWidth={2.4} />} onPress={() => router.push({ pathname: '/list/add', params: { id } })} />}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pill title="Karıştır" variant="outline" style={{ flex: 1 }} disabled={items.length < 2}
            left={<Icon name="shuffle" size={16} color={items.length < 2 ? colors.white : colors.label} strokeWidth={2} />}
            onPress={() => player.playList(shuffled(tracks), 0, p.name, source)} />
          {mayEdit && items.length > 0 && (
            <Pill title={editing ? 'Bitti' : 'Düzenle'} variant={editing ? 'primary' : 'outline'} style={{ flex: 1 }}
              onPress={() => { setEditing((e) => !e); setHeld(undefined); }} />
          )}
        </View>
      </View>

      {items.length > 0 && (
        <>
          <View style={{ marginTop: 28, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={type.title2}>Plaklar</Text>
            <Text style={[type.footnote, { color: colors.secondary }]}>{mayEdit ? 'Dokun: çal · basılı tut: taşı, çıkar' : 'Dokun: çal'}</Text>
          </View>
          <View style={{ borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 12 }}>
            {items.map(({ id: rowId, track: t }, i) => {
              const current = deck?.id === rowId;
              return (
                <Pressable key={rowId} accessibilityRole="button" accessibilityLabel={`${t.title}, çal`} onPress={() => playFrom(i)} onLongPress={() => rowMenu(i, t)} delayLongPress={350}
                  style={({ pressed }) => ({ height: 60, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.6 : 1, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.hairline })}>
                  <View style={{ width: 28, alignItems: 'center' }}>
                    {current ? <PlayingBars playing={player.playing} color={colors.label} /> : <Text style={[type.footnote, type.numeric, { color: colors.secondary, fontWeight: '600' }]}>{slotCode(i % PAGE)}</Text>}
                  </View>
                  <Cover cover={t.cover} size={40} radius={6} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.callout, { fontWeight: current ? '700' : '500' }]} numberOfLines={1}>{t.title}</Text>
                    <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{t.artist || ' '}</Text>
                  </View>
                  <Text style={[type.footnote, type.numeric, { color: colors.secondary }]}>{t.duration ? formatTime(t.duration) : ''}</Text>
                  {mayEdit && (
                    <Pressable accessibilityRole="button" accessibilityLabel={`${t.title} seçenekleri`} hitSlop={8} onPress={() => rowMenu(i, t)} style={{ width: 28, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="more" size={16} color={colors.secondary} />
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {pl.log.length > 0 && (
        <>
          <Text style={[type.footnote, { color: colors.secondary, marginTop: 24, marginBottom: 6 }]}>Canlı</Text>
          {pl.log.slice(0, 4).map((l) => (
            <Animated.View key={l.id} entering={FadeInDown} layout={LinearTransition} style={{ height: 34, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 0.5, borderTopColor: colors.hairline }}>
              <Text style={[type.caption, type.numeric, { width: 44, fontWeight: '600', color: colors.secondary }]}>{ago(l.at, now)}</Text>
              <Text style={[type.subhead, { flex: 1 }]} numberOfLines={1}>{l.videoId ? `“${meta[l.videoId]?.title ?? '…'}” ${l.text}` : l.text}</Text>
            </Animated.View>
          ))}
        </>
      )}
      <View style={{ height: player.track ? FLOATING_PLAYER_INSET : 0 }} />
    </Screen>
    <FloatingMiniPlayer />
    </View>
  );
}

function Round({ icon, label, onPress, disabled }: { icon: 'left' | 'right' | 'close'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      <Icon name={icon} size={icon === 'close' ? 13 : 16} />
    </Pressable>
  );
}
