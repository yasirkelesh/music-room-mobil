import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import type { UserSearchResult } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Cover } from '@/components/Cover';
import { Disc } from '@/components/Disc';
import { Icon } from '@/components/Icon';
import { Segments } from '@/components/Party';
import { FormError, Pill, SearchField, SectionHeader } from '@/components/ui';
import { CoverKey, covers, formatTime, genres, Track } from '@/data/mock';
import { personOf } from '@/lib/people';
import { useAsync } from '@/lib/useAsync';
import { useTrackSearch } from '@/lib/useTrackSearch';
import { useAuth } from '@/state/auth';
import { usePlayer } from '@/state/player';
import { colors, type } from '@/theme';
import { useTabInset } from '@/components/MiniPlayer';
import { showTrackMenu } from '@/components/TrackMenu';
import { useKeyboardHeight } from '@/lib/keyboard';
import { readable } from '@/lib/layout';

type Tab = 'tracks' | 'people';
const crateKeys = Object.keys(covers) as CoverKey[];

/** What you searched for this session (kept in memory, newest first). */
let recent: string[] = [];
const remember = (q: string) => {
  const t = q.trim();
  if (t.length < 2) return;
  recent = [t, ...recent.filter((x) => x.toLocaleLowerCase('tr-TR') !== t.toLocaleLowerCase('tr-TR'))].slice(0, 8);
};


/** A coloured record crate for a genre, with a record sticking out. */
function Crate({ label, k, onPress }: { label: string; k: CoverKey; onPress: () => void }) {
  const c = covers[k];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ara`} onPress={onPress}
      style={({ pressed }) => ({ width: '48.5%', height: 104, borderRadius: 16, backgroundColor: c.base, padding: 14, overflow: 'hidden', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Text style={[type.headline, { color: c.onBase }]} numberOfLines={2}>{label}</Text>
      <View style={{ position: 'absolute', right: -26, bottom: -30, transform: [{ rotate: '-18deg' }] }}>
        <Disc cover={k} size={92} finish="vinyl" label={0.42} holeColor={c.base} />
      </View>
    </Pressable>
  );
}

/** The best match, out of its sleeve. */
function TopResult({ t, playing, onPlay }: { t: Track; playing: boolean; onPlay: () => void }) {
  return (
    <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: colors.card, padding: 14, flexDirection: 'row', gap: 14 }}>
      <View style={{ width: 128, height: 108 }}>
        <View style={{ position: 'absolute', left: 24, top: 4 }}>
          <Disc cover={t.cover} size={100} finish="vinyl" label={0.42} spinning={playing} duration={2400} holeColor={colors.card} />
        </View>
        <View style={{ borderRadius: 6, shadowColor: colors.black, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 2, height: 4 } }}>
          <Cover cover={t.cover} size={108} radius={6} />
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
        <View>
          <Text style={[type.caption, { color: colors.secondary, fontWeight: '700', letterSpacing: 0.8 }]}>EN İYİ EŞLEŞME</Text>
          <Text style={[type.callout, { fontWeight: '700', marginTop: 2 }]} numberOfLines={2}>{t.title}</Text>
          <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{t.artist}{t.duration ? ` · ${formatTime(t.duration)}` : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Pill title={playing ? 'Çalıyor' : 'Çal'} height={36} style={{ paddingHorizontal: 16 }} left={<Icon name={playing ? 'pause' : 'play'} size={13} color={colors.white} />} onPress={onPlay} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${t.title} ekle`} onPress={() => showTrackMenu(t)}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={15} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function People({ q }: { q: string }) {
  const { userId } = useAuth();
  const [found, setFound] = useState<{ term: string; users: UserSearchResult[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const friends = useAsync(() => api.friends.list({ pageSize: 100 }));
  const outgoing = useAsync(() => api.friends.requests('outgoing', { pageSize: 100 }));
  const term = q.trim();

  useEffect(() => {
    if (!term) return;
    let live = true;
    const t = setTimeout(async () => {
      try { const users = await api.users.search(term, { pageSize: 30 }); if (live) { setFound({ term, users }); setError(null); } }
      catch (e) { if (live) setError(describeError(e)); }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [term]);

  const friendIds = new Set((friends.data ?? []).map((f) => f.userId));
  const pending = new Set([...(outgoing.data ?? []).map((r) => r.userId), ...asked]);
  const users = term && found?.term === term ? found.users.filter((u) => u.userId !== userId) : [];

  const ask = async (u: UserSearchResult) => {
    try { await api.friends.ask(u.userId); setAsked((s) => new Set(s).add(u.userId)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    catch (e) { if (e instanceof ApiError && e.status === 409) setAsked((s) => new Set(s).add(u.userId)); else setError(describeError(e)); }
  };

  if (!term) return <Text style={[type.subhead, { color: colors.secondary, marginTop: 24, lineHeight: 21 }]}>Arkadaşlarını adlarıyla bul; birlikte dinleyin, dolaplarını paylaşın, partilere çağırın.</Text>;
  return (
    <>
      <FormError message={error} />
      {found?.term === term && users.length === 0 && <Text style={[type.subhead, { color: colors.secondary, marginTop: 20 }]}>Bu adla başlayan kimse yok.</Text>}
      <View style={{ marginTop: 12, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 14 }}>
        {users.map((u, i) => (
          <View key={u.userId} style={{ minHeight: 64, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.hairline }}>
            <Avatar person={personOf(u.displayName, u.userId)} size={40} />
            <Text style={[type.body, { flex: 1, minWidth: 0, fontWeight: '500' }]} numberOfLines={2}>{u.displayName}</Text>
            {friendIds.has(u.userId)
              ? <Text style={[type.footnote, { color: colors.secondary, flexShrink: 0 }]}>Arkadaşın</Text>
              : pending.has(u.userId)
                ? <Text style={[type.footnote, { color: colors.secondary, flexShrink: 0, textAlign: 'right' }]}>{'İstek\ngönderildi'}</Text>
                : <Pill title="Ekle" height={36} style={{ paddingHorizontal: 16 }} onPress={() => ask(u)} />}
          </View>
        ))}
      </View>
    </>
  );
}

export default function Search() {
  const tabInset = useTabInset();
  const kb = useKeyboardHeight();
  const { me } = useAuth();
  const player = usePlayer();
  const [tab, setTab] = useState<Tab>('tracks');
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  // Opened with ?q= while the tab is already alive (a deep link, a genre elsewhere): search for it.
  useEffect(() => { if (!params.q) return; const t = setTimeout(() => { setQ(params.q!); setTab('tracks'); remember(params.q!); }, 0); return () => clearTimeout(t); }, [params.q]);
  const [, bump] = useState(0);
  const search = useTrackSearch(tab === 'tracks' ? q : '', 25);
  const term = q.trim();
  const source = `search:${term.toLocaleLowerCase('tr-TR')}`;

  const look = (text: string) => { setQ(text); remember(text); bump((n) => n + 1); };
  const play = (i: number) => {
    remember(term);
    if (player.source === source && player.track?.id === search.results[i].id) { player.toggle(); return; }
    player.playList(search.results, i, `“${term}” araması`, source);
  };
  const playingId = player.source === source && player.playing ? player.track?.id : undefined;

  const mine = (me?.genres ?? []).filter(Boolean);
  const others = genres.filter((g) => !mine.includes(g));
  const [top, ...rest] = search.results;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* while typing the keyboard, not the tab bar, hides the end of the results */}
      <ScrollView contentContainerStyle={{ ...readable, paddingHorizontal: 20, paddingBottom: Math.max(tabInset, kb + 24) }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text accessibilityRole="header" style={[type.largeTitle, { marginTop: 44 }]}>Ara</Text>
        <Text style={[type.subhead, { color: colors.secondary, marginTop: 4 }]}>Plak bul, pikapta dinle, dolabına ya da partiye ekle.</Text>
        <View style={{ marginTop: 14, gap: 10 }}>
          <SearchField placeholder={tab === 'tracks' ? 'Şarkı ya da sanatçı' : 'Kişi adı'} value={q} onChangeText={setQ} autoCorrect={false}
            returnKeyType="search" onSubmitEditing={() => { remember(q); bump((n) => n + 1); }} accessibilityLabel="Ara" />
          <Segments value={tab} onChange={setTab} options={[{ value: 'tracks', label: 'Plaklar' }, { value: 'people', label: 'Kişiler' }]} light />
        </View>

        {tab === 'people' ? <People q={q} /> : term.length >= 2 ? (
          <>
            {search.loading && <ActivityIndicator style={{ marginTop: 28 }} />}
            <FormError message={search.error} />
            {!search.loading && !search.error && search.results.length === 0 && (
              <Text style={[type.subhead, { color: colors.secondary, marginTop: 20 }]}>“{term}” için plak bulunamadı.</Text>
            )}
            {top && <TopResult t={top} playing={playingId === top.id} onPlay={() => play(0)} />}
            {rest.length > 0 && (
              <View style={{ marginTop: 14, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 12 }}>
                {rest.map((t, j) => {
                  const i = j + 1;
                  const current = player.source === source && player.track?.id === t.id;
                  return (
                    <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.title}, çal`} onPress={() => play(i)} onLongPress={() => showTrackMenu(t, { play: () => play(i) })} delayLongPress={350}
                      style={({ pressed }) => ({ minHeight: 64, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.6 : 1, borderTopWidth: j ? 0.5 : 0, borderTopColor: colors.hairline })}>
                      <View style={{ width: 52, height: 44 }}>
                        <View style={{ position: 'absolute', left: 10, top: 1 }}>
                          <Disc cover={t.cover} size={42} finish="vinyl" label={0.42} spinning={current && player.playing} duration={2400} holeColor={colors.card} />
                        </View>
                        <Cover cover={t.cover} size={44} radius={4} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[type.callout, { fontWeight: current ? '700' : '500' }]} numberOfLines={2}>{t.title}</Text>
                        <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{t.artist}{t.duration ? ` · ${formatTime(t.duration)}` : ''}</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${t.title} ekle`} hitSlop={6} onPress={() => showTrackMenu(t)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="plus" size={16} color={colors.secondary} />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            {recent.length > 0 && (
              <>
                <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={type.title2}>Son aramalar</Text>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { recent = []; bump((n) => n + 1); }}>
                    <Text style={[type.subhead, { color: colors.secondary }]}>Temizle</Text>
                  </Pressable>
                </View>
                <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {recent.map((r) => (
                    <Pressable key={r} accessibilityRole="button" onPress={() => look(r)}
                      style={({ pressed }) => ({ height: 36, borderRadius: 18, paddingHorizontal: 14, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
                      <Icon name="search" size={13} color={colors.secondary} strokeWidth={2} />
                      <Text style={type.subhead}>{r}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {mine.length > 0 && (
              <>
                <SectionHeader>Senin türlerin</SectionHeader>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
                  {mine.map((g, i) => <Crate key={g} label={g} k={crateKeys[i % crateKeys.length]} onPress={() => look(g)} />)}
                </View>
              </>
            )}
            <SectionHeader>{mine.length ? 'Başka kasalar' : 'Türlere göz at'}</SectionHeader>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {others.map((g, i) => <Crate key={g} label={g} k={crateKeys[(i + mine.length) % crateKeys.length]} onPress={() => look(g)} />)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
