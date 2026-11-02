import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import type { Friend, FriendRequest, UserSearchResult } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { FormError, Group, Pill, Screen, SearchField, SectionHeader, Title, TopBar } from '@/components/ui';
import { personOf } from '@/lib/people';
import { useAsync } from '@/lib/useAsync';
import { colors, type } from '@/theme';

const PAGE = 100;

export default function Friends() {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<UserSearchResult[]>([]);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const friends = useAsync(() => api.friends.list({ pageSize: PAGE }));
  const incoming = useAsync(() => api.friends.requests('incoming', { pageSize: PAGE }));
  const outgoing = useAsync(() => api.friends.requests('outgoing', { pageSize: PAGE }));

  // Search by display-name prefix, debounced; a blank query asks nothing.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const r = await api.users.search(q, { pageSize: 20 });
        if (live) { setFound(r); setError(null); }
      } catch (e) {
        if (live) { setFound([]); setError(describeError(e)); }
      }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [query]);

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    try { await fn(); after?.(); } catch (e) { setError(describeError(e)); }
  };

  const answer = (r: FriendRequest, status: 'accepted' | 'declined') =>
    run(() => api.friends.answer(r.requestId, status), () => {
      incoming.setData((list) => (list ?? []).filter((x) => x.requestId !== r.requestId));
      if (status === 'accepted') friends.reload();
    });
  const ask = (u: UserSearchResult) =>
    run(() => api.friends.ask(u.userId), () => { setAsked((s) => new Set(s).add(u.userId)); outgoing.reload(); });
  const withdraw = (r: FriendRequest) =>
    run(() => api.friends.withdraw(r.requestId), () => {
      outgoing.setData((list) => (list ?? []).filter((x) => x.requestId !== r.requestId));
      setAsked((s) => { const n = new Set(s); n.delete(r.userId); return n; });
    });

  const results = query.trim() ? found : [];
  const friendIds = new Set((friends.data ?? []).map((f) => f.userId));
  const pendingIds = new Set((outgoing.data ?? []).map((r) => r.userId));
  const sent = outgoing.data ?? [];
  const requests = incoming.data ?? [];
  const list = friends.data ?? [];

  return (
    <Screen scroll>
      <TopBar />
      <Title style={{ marginTop: 8 }}>Arkadaşlar</Title>
      <View style={{ marginTop: 14 }}>
        <SearchField placeholder="Ada göre kullanıcı ara" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Kullanıcı ara" />
      </View>
      <FormError message={error} />

      {query.trim() !== '' && (
        <>
          <SectionHeader>Sonuçlar</SectionHeader>
          <Group>
            {results.length === 0 && <Text style={[type.subhead, { color: colors.secondary, paddingVertical: 16 }]}>Eşleşen kullanıcı yok.</Text>}
            {results.map((u) => (
              <Row key={u.userId} name={u.displayName} id={u.userId}
                right={friendIds.has(u.userId)
                  ? <Text style={[type.subhead, { color: colors.secondary }]}>Arkadaşın</Text>
                  : asked.has(u.userId) || pendingIds.has(u.userId)
                    ? <Text style={[type.subhead, { color: colors.secondary }]}>İstek gönderildi</Text>
                    : <Pill title="Ekle" height={32} style={{ paddingHorizontal: 14 }} onPress={() => ask(u)} />} />
            ))}
          </Group>
        </>
      )}

      {requests.length > 0 && (
        <>
          <SectionHeader>{`İstekler · ${requests.length}`}</SectionHeader>
          <Group>
            {requests.map((r) => (
              <Row key={r.requestId} name={r.displayName} id={r.userId} exiting
                right={
                  <>
                    <Pill title="Kabul et" height={32} style={{ paddingHorizontal: 14 }} onPress={() => answer(r, 'accepted')} />
                    <Pressable accessibilityRole="button" accessibilityLabel={`${r.displayName} isteğini reddet`} onPress={() => answer(r, 'declined')} hitSlop={8} style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="close" size={14} color={colors.tertiary} />
                    </Pressable>
                  </>
                } />
            ))}
          </Group>
        </>
      )}

      {sent.length > 0 && (
        <>
          <SectionHeader>{`Gönderdiğin istekler · ${sent.length}`}</SectionHeader>
          <Group>
            {sent.map((r) => (
              <Row key={r.requestId} name={r.displayName} id={r.userId} exiting
                sub={`${new Date(r.requestedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · yanıt bekleniyor`}
                right={
                  <Pressable accessibilityRole="button" accessibilityLabel={`${r.displayName} isteğini geri çek`} onPress={() => withdraw(r)} hitSlop={6}
                    style={{ height: 32, borderRadius: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.separator, justifyContent: 'center' }}>
                    <Text style={[type.footnote, { fontWeight: '600' }]}>Geri çek</Text>
                  </Pressable>
                } />
            ))}
          </Group>
        </>
      )}

      <SectionHeader>{`Arkadaşların · ${list.length}`}</SectionHeader>
      <Group>
        {!friends.loading && list.length === 0 && <Text style={[type.subhead, { color: colors.secondary, paddingVertical: 16 }]}>Henüz arkadaşın yok. Yukarıdan ada göre ara.</Text>}
        {list.map((f: Friend) => (
          <Row key={f.userId} name={f.displayName} id={f.userId}
            sub={`${new Date(f.friendsSince).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}’den beri`}
            right={
              <Pressable accessibilityRole="button" accessibilityLabel={`${f.displayName} arkadaşlıktan çıkar`} hitSlop={8}
                onPress={() => run(() => api.friends.remove(f.userId), () => friends.setData((l) => (l ?? []).filter((x) => x.userId !== f.userId)))}
                style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={colors.tertiary} />
              </Pressable>
            } />
        ))}
      </Group>
      {friends.error ? <FormError message={describeError(friends.error)} /> : null}
    </Screen>
  );
}

function Row({ name, id, sub, right, exiting }: { name: string; id: string; sub?: string; right?: React.ReactNode; exiting?: boolean }) {
  return (
    <Animated.View exiting={exiting ? FadeOut : undefined} layout={LinearTransition} style={{ minHeight: 60, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar person={personOf(name, id)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.callout, { fontWeight: '500' }]} numberOfLines={1}>{name}</Text>
        {sub ? <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right}
    </Animated.View>
  );
}
