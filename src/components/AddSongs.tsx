// The "add songs" sheet shared by parties and playlists.

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import type { PlaylistSummary } from '@/api/types';
import { formatTime, Track } from '@/data/mock';
import { thumbnail, useTracks } from '@/lib/tracks';
import { useAsync } from '@/lib/useAsync';
import { useTrackSearch } from '@/lib/useTrackSearch';
import { colors, type } from '@/theme';
import { Cover, Mosaic } from './Cover';
import { Icon } from './Icon';
import { dark, DarkSearchField, Segments } from './Party';
import { useKeyboardHeight } from '@/lib/keyboard';
import { readable } from '@/lib/layout';

type Tab = 'search' | 'lists';
type AddState = 'idle' | 'busy' | 'added' | 'queued';

/** What the host screen reports back for one add. */
export type AddOutcome = 'added' | 'exists' | { error: string };

/**
 * A dark sheet for adding songs: search the catalog, or pick from your own playlists (which costs no
 * catalog quota). Songs already present are marked. Used by parties (suggest) and playlists (add).
 */
export function AddSongs({ title, existing, onAdd, addedText, existsLabel = 'Eklendi', excludeListId, emptyHint, onDone, embedded }: {
  title: string;
  /** Video ids already in the target, shown as `existsLabel` instead of an add button. */
  existing: Set<string>;
  onAdd: (t: Track) => Promise<AddOutcome>;
  addedText: (t: Track) => string;
  existsLabel?: string;
  /** Hide this playlist in "Listelerimden" (adding a list to itself). */
  excludeListId?: string;
  emptyHint: string;
  /** "Bitti". Default: leave the sheet screen. */
  onDone?: () => void;
  /** Shown inside another screen's modal instead of as its own route: leaves that screen's options alone. */
  embedded?: boolean;
}) {
  const kb = useKeyboardHeight();
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [state, setState] = useState<Record<string, AddState>>({});
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSeq = useRef(0);
  const search = useTrackSearch(q, 20);

  // While typing, a drag belongs to the results: the sheet's own pull-to-close would take it first
  // (Android: anywhere in the top part of the sheet), the list would never see it and the keyboard
  // would stay up. With the keyboard down, pulling closes the sheet again.
  const navigation = useNavigation();
  // grabber + title row only: the search field and the results below must take their own touches
  useEffect(() => { if (!embedded) navigation.setOptions({ gestureEnabled: kb === 0, gestureResponseDistance: 72 }); }, [navigation, kb, embedded]);
  // a short result list does not scroll, so no scroll event: a vertical finger move closes the keyboard too
  const touchY = useRef<number | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const say = (text: string) => {
    setToast({ key: ++toastSeq.current, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const add = async (t: Track) => {
    setState((s) => ({ ...s, [t.id]: 'busy' }));
    const r = await onAdd(t);
    if (r === 'added') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setState((s) => ({ ...s, [t.id]: 'added' }));
      say(addedText(t));
    } else if (r === 'exists') {
      setState((s) => ({ ...s, [t.id]: 'queued' }));
      say(`${existsLabel}: “${t.title}”`);
    } else {
      setState((s) => ({ ...s, [t.id]: 'idle' }));
      say(r.error);
    }
  };

  const status = (t: Track): AddState => state[t.id] ?? (existing.has(t.id) ? 'queued' : 'idle');

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: dark.faint }} />
        </View>
        <View style={{ height: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[type.title2, { color: colors.white }]}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={onDone ?? (() => router.back())} hitSlop={8} style={{ height: 44, justifyContent: 'center' }}>
            <Text style={[type.headline, { color: colors.white }]}>Bitti</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Segments value={tab} onChange={setTab} options={[{ value: 'search', label: 'Ara' }, { value: 'lists', label: 'Listelerimden' }]} />
          {tab === 'search' && (
            <DarkSearchField placeholder="Şarkı ya da sanatçı" value={q} onChangeText={setQ} autoFocus autoCorrect={false} returnKeyType="search" accessibilityLabel="Şarkı ara" />
          )}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScrollBeginDrag={Keyboard.dismiss}
          onTouchStart={(e) => { touchY.current = e.nativeEvent.pageY; }}
          onTouchMove={(e) => { if (kb > 0 && touchY.current !== null && Math.abs(e.nativeEvent.pageY - touchY.current) > 12) { touchY.current = null; Keyboard.dismiss(); } }}
          showsVerticalScrollIndicator={false} contentContainerStyle={{ ...readable, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 + kb }}>
          {tab === 'search' ? (
            <>
              {q.trim().length < 2 && <Hint text={emptyHint} />}
              {search.loading && <ActivityIndicator color={colors.white} style={{ marginTop: 28 }} />}
              {search.error && <Hint text={search.error} />}
              {!search.loading && q.trim().length >= 2 && search.results.length === 0 && !search.error && <Hint text="Sonuç bulunamadı." />}
              {search.results.map((t) => <Row key={t.id} t={t} state={status(t)} onAdd={() => add(t)} existsLabel={existsLabel} />)}
            </>
          ) : (
            <MyLists status={status} onAdd={add} exclude={excludeListId} existsLabel={existsLabel} />
          )}
        </ScrollView>

        {toast && (
          <Animated.View key={toast.key} entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)} pointerEvents="none"
            style={{ position: 'absolute', left: 20, right: 20, bottom: 36, borderRadius: 16, backgroundColor: colors.white, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="check" size={16} color={colors.black} strokeWidth={2.4} />
            <Text style={[type.subhead, { color: colors.black, fontWeight: '600', flex: 1 }]} numberOfLines={1}>{toast.text}</Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Hint({ text }: { text: string }) {
  return <Text style={[type.subhead, { color: dark.sub, marginTop: 24, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 }]}>{text}</Text>;
}

function Row({ t, state, onAdd, existsLabel }: { t: Track; state: AddState; onAdd: () => void; existsLabel: string }) {
  return (
    <View style={{ height: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Cover cover={t.cover} size={48} radius={8} />
      <View style={{ flex: 1 }}>
        <Text style={[type.callout, { color: colors.white, fontWeight: '500' }]} numberOfLines={1}>{t.title}</Text>
        <Text style={[type.footnote, { color: dark.sub }]} numberOfLines={1}>{t.artist}{t.duration ? ` · ${formatTime(t.duration)}` : ''}</Text>
      </View>
      <AddButton state={state} label={t.title} onPress={onAdd} existsLabel={existsLabel} />
    </View>
  );
}

function AddButton({ state, label, onPress, existsLabel }: { state: AddState; label: string; onPress: () => void; existsLabel: string }) {
  if (state === 'queued') return <Text style={[type.footnote, { color: dark.sub, fontWeight: '600', width: 64, textAlign: 'right' }]}>{existsLabel}</Text>;
  const added = state === 'added';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={added ? `${label} eklendi` : `${label} sıraya ekle`} disabled={state !== 'idle'} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({
        width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        backgroundColor: added ? colors.white : 'transparent', borderWidth: added ? 0 : 1.5, borderColor: 'rgba(255,255,255,0.45)',
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}>
      {state === 'busy' ? <ActivityIndicator size="small" color={colors.white} />
        : <Icon name={added ? 'check' : 'plus'} size={16} color={added ? colors.black : colors.white} strokeWidth={2.4} />}
    </Pressable>
  );
}

function MyLists({ status, onAdd, exclude, existsLabel }: { status: (t: Track) => AddState; onAdd: (t: Track) => void; exclude?: string; existsLabel: string }) {
  const mine = useAsync(() => api.playlists.list('mine', { pageSize: 50 }));
  const shared = useAsync(() => api.playlists.list('shared', { pageSize: 50 }));
  const [open, setOpen] = useState<string | null>(null);
  const lists = [...(mine.data ?? []), ...(shared.data ?? [])].filter((p) => p.playlistId !== exclude);

  if (mine.loading) return <ActivityIndicator color={colors.white} style={{ marginTop: 28 }} />;
  if (lists.length === 0) return <Hint text="Henüz listen yok. Listeler sekmesinden oluşturduğun listelerin şarkıları burada görünür." />;
  return (
    <View style={{ marginTop: 4 }}>
      {lists.map((p) => <ListBlock key={p.playlistId} p={p} open={open === p.playlistId} onToggle={() => setOpen((o) => (o === p.playlistId ? null : p.playlistId))} status={status} onAdd={onAdd} existsLabel={existsLabel} />)}
    </View>
  );
}

function ListBlock({ p, open, onToggle, status, onAdd, existsLabel }: { p: PlaylistSummary; open: boolean; onToggle: () => void; status: (t: Track) => AddState; onAdd: (t: Track) => void; existsLabel: string }) {
  const tracks = useAsync(() => api.playlists.allTracks(p.playlistId), [p.playlistId]);
  const ids = (tracks.data?.tracks ?? []).map((t) => t.youtubeVideoId);
  const meta = useTracks(open ? ids : []);
  return (
    <Animated.View layout={LinearTransition.duration(200)} style={{ borderBottomWidth: 0.5, borderBottomColor: dark.line }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={{ height: 68, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Mosaic items={ids.slice(0, 4).map((v) => ({ uri: thumbnail(v) }))} size={48} radius={8} />
        <View style={{ flex: 1 }}>
          <Text style={[type.callout, { color: colors.white, fontWeight: '600' }]} numberOfLines={1}>{p.name}</Text>
          <Text style={[type.footnote, { color: dark.sub }]}>{tracks.data ? `${ids.length} şarkı` : ' '}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="down" size={18} color={dark.sub} /></View>
      </Pressable>
      {open && (
        <View style={{ paddingBottom: 8 }}>
          {ids.length === 0 && <Text style={[type.footnote, { color: dark.sub, paddingBottom: 12 }]}>Bu liste boş.</Text>}
          {[...new Set(ids)].map((v) => <Row key={v} t={meta[v]} state={status(meta[v])} onAdd={() => onAdd(meta[v])} existsLabel={existsLabel} />)}
        </View>
      )}
    </Animated.View>
  );
}
