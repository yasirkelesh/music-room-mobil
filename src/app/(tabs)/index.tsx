import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { SeekRow, Turntable } from '@/components/Jukebox';
import { ListSleeve, NewSleeve } from '@/components/ListSleeve';
import { liveAt, LiveCard, StartCard } from '@/components/PartyCards';
import { LiveDot, TextButton } from '@/components/ui';
import { personOf } from '@/lib/people';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/state/auth';
import { usePlayer } from '@/state/player';
import { colors, type } from '@/theme';
import { useTabInset } from '@/components/MiniPlayer';
import { readable } from '@/lib/layout';
import { describeError } from '@/api/errors';
import { devlog } from '@/lib/devlog';

const greeting = (h: number) => (h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : h < 23 ? 'İyi akşamlar' : 'İyi geceler');

function Head({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={{ marginTop: 36, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={type.title2}>{title}</Text>
      {action && <TextButton title={action} onPress={onPress} />}
    </View>
  );
}

/** The deck at home: whatever is playing, from wherever. Tap it for the full player. */
function Deck() {
  const player = usePlayer();
  const t = player.track;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t ? `Şimdi çalıyor: ${t.title}` : 'Pikap boş'} disabled={!t} onPress={() => router.push('/now-playing')}
      style={({ pressed }) => ({ marginTop: 20, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <Turntable
        record={t ?? undefined}
        caption={t ? (player.label ?? 'Şimdi çalıyor') : undefined}
        playing={player.playing}
        spinning={player.playing && !player.buffering}
        onToggle={player.toggle}
        onNext={t && !player.controlled ? player.next : undefined}
        onPrev={t && !player.controlled ? player.prev : undefined}
        empty="Pikap boş. Bir dolaptan plak seç."
      />
      {t ? <View style={{ marginTop: 10 }}><SeekRow /></View> : (
        <View style={{ alignItems: 'flex-start', marginTop: 4 }}><TextButton title="Dolaplara git" onPress={() => router.push('/lists')} /></View>
      )}
    </Pressable>
  );
}

export default function Home() {
  const tabInset = useTabInset();
  const { me } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const lists = useAsync(() => api.playlists.list('mine', { pageSize: 10 }));
  const shared = useAsync(() => api.playlists.list('shared', { pageSize: 10 }));
  const mine = useAsync(() => api.events.list('mine', { pageSize: 20 }));
  const invited = useAsync(() => api.events.list('invited', { pageSize: 20 }));
  const pub = useAsync(() => api.events.list('public', { pageSize: 20 }));
  const friends = useAsync(() => api.friends.list({ pageSize: 20 }));
  const requests = useAsync(() => api.friends.requests('incoming', { pageSize: 20 }));
  useFocusEffect(useCallback(() => {
    setNow(Date.now());
    lists.reload(); shared.reload(); mine.reload(); invited.reload(); pub.reload(); friends.reload(); requests.reload();
  }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  // The party to show first: one of yours, then one you were invited to, then any public one.
  const live = [mine.data, invited.data, pub.data].flatMap((l) => (l ?? []).filter((e) => liveAt(e, now)))[0];
  const partiesLoading = mine.loading || invited.loading || pub.loading;
  const sleeves = [...(lists.data ?? []), ...(shared.data ?? [])];
  const listsError = lists.error ?? shared.error;
  // TEMP (Android: cabinet empty on home but not on the Lists tab) — what did the two requests return?
  useEffect(() => {
    devlog('[home] lists', { mine: lists.data?.length ?? null, shared: shared.data?.length ?? null, loading: lists.loading || shared.loading,
      err: lists.error ? describeError(lists.error) : null, sharedErr: shared.error ? describeError(shared.error) : null, ids: (lists.data ?? []).map((p) => p.playlistId) });
  }, [lists.data, shared.data, lists.error, shared.error, lists.loading, shared.loading]);
  const pending = requests.data?.length ?? 0;
  const firstName = me?.displayName.split(' ')[0];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ ...readable, paddingHorizontal: 20, paddingBottom: tabInset }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LiveDot size={8} />
            <Text style={[type.headline, { fontSize: 15 }]}>music-room</Text>
          </View>
          <Link href="/profile" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Profil"><Avatar person={personOf(me?.displayName ?? '?')} size={40} /></Pressable>
          </Link>
        </View>

        <Text accessibilityRole="header" style={[type.hero, { fontSize: 36, lineHeight: 40, marginTop: 20 }]}>
          {greeting(new Date(now).getHours())}{firstName ? `,\n${firstName}` : ''}
        </Text>

        <Deck />

        {live ? <LiveCard e={live} /> : !partiesLoading && <StartCard />}

        <Head title="Plak dolapların" action={sleeves.length ? 'Tümü' : undefined} onPress={() => router.push('/lists')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
          {sleeves.map((p) => <ListSleeve key={p.playlistId} p={p} size={150} onChanged={lists.reload} />)}
          <NewSleeve size={150} />
        </ScrollView>
        {/* a failed load used to look exactly like "no lists yet" */}
        {listsError && !sleeves.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Text style={[type.footnote, { color: colors.secondary, flex: 1 }]}>Dolapların yüklenemedi. {describeError(listsError)}</Text>
            <TextButton title="Tekrar dene" onPress={() => { lists.reload(); shared.reload(); }} />
          </View>
        ) : null}

        <Head title="Arkadaşlar" action="Tümü" onPress={() => router.push('/friends')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={pending ? `Arkadaş ekle, ${pending} istek` : 'Arkadaş ekle'} onPress={() => router.push('/friends')} style={{ alignItems: 'center', gap: 6, width: 60 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={20} />
              {pending > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[type.caption, { color: colors.white, fontWeight: '700' }]}>{pending}</Text>
                </View>
              )}
            </View>
            <Text style={[type.caption, { color: colors.secondary }]} numberOfLines={1}>{pending ? 'İstekler' : 'Ekle'}</Text>
          </Pressable>
          {(friends.data ?? []).map((f) => (
            <View key={f.userId} style={{ alignItems: 'center', gap: 6, width: 60 }}>
              <Avatar person={personOf(f.displayName, f.userId)} size={52} />
              <Text style={[type.caption, { color: colors.label }]} numberOfLines={1}>{f.displayName}</Text>
            </View>
          ))}
          {friends.data && friends.data.length === 0 && (
            <Text style={[type.subhead, { color: colors.secondary, alignSelf: 'center', marginLeft: 4 }]}>Arkadaşlarını bul, birlikte dinleyin.</Text>
          )}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
