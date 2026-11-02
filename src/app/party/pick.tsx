import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import type { EventSummary } from '@/api/types';
import { Blink } from '@/components/Blink';
import { Cover } from '@/components/Cover';
import { Icon } from '@/components/Icon';
import { hm, liveAt } from '@/components/PartyCards';
import { FormError, Group, Screen, SectionHeader, Title, TopBar } from '@/components/ui';
import { useTracks } from '@/lib/tracks';
import { useAsync } from '@/lib/useAsync';
import { colors, type } from '@/theme';

/** "Suggest to a party": pick which party's queue receives the track. */
export default function PickParty() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const track = useTracks([videoId])[videoId];
  const mine = useAsync(() => api.events.list('mine', { pageSize: 50 }));
  const invited = useAsync(() => api.events.list('invited', { pageSize: 50 }));
  const pub = useAsync(() => api.events.list('public', { pageSize: 50 }));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seen = new Set<string>();
  const all = [...(mine.data ?? []), ...(invited.data ?? []), ...(pub.data ?? [])]
    .filter((e) => now <= +new Date(e.endsAtUtc) && (seen.has(e.eventId) ? false : (seen.add(e.eventId), true)));
  const live = all.filter((e) => liveAt(e, now));
  const later = all.filter((e) => !liveAt(e, now)).sort((a, b) => +new Date(a.startsAtUtc) - +new Date(b.startsAtUtc));

  const suggest = async (e: EventSummary) => {
    setBusy(e.eventId);
    setError(null);
    try {
      await api.events.suggest(e.eventId, videoId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone(e.eventId);
      setTimeout(() => router.back(), 700);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) { setDone(e.eventId); setError('Bu şarkı o partide zaten sırada.'); return; }
      setError(err instanceof ApiError && err.status === 404 ? 'Bu partiye şarkı öneremezsin.' : describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const row = (e: EventSummary) => {
    const isLive = liveAt(e, now);
    return (
      <Pressable key={e.eventId} accessibilityRole="button" disabled={!!busy || !!done} onPress={() => suggest(e)}
        style={({ pressed }) => ({ height: 64, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed || (busy && busy !== e.eventId) ? 0.5 : 1 })}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isLive ? colors.black : colors.fill, alignItems: 'center', justifyContent: 'center' }}>
          {isLive
            ? <Blink><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4D4D' }} /></Blink>
            : <Text style={[type.caption, type.numeric, { fontWeight: '700' }]}>{hm(e.startsAtUtc)}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.body, { fontWeight: '500' }]} numberOfLines={1}>{e.name}</Text>
          <Text style={[type.footnote, { color: colors.secondary }]}>{isLive ? `Canlı · ${hm(e.endsAtUtc)}’e kadar` : `${hm(e.startsAtUtc)}–${hm(e.endsAtUtc)}`}</Text>
        </View>
        {done === e.eventId ? <Icon name="check" size={18} /> : <Icon name="plus" size={16} color={colors.secondary} />}
      </Pressable>
    );
  };

  return (
    <Screen scroll>
      <TopBar />
      <Title style={{ marginTop: 8 }}>Partiye öner</Title>
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Cover cover={track.cover} size={48} radius={6} />
        <View style={{ flex: 1 }}>
          <Text style={[type.callout, { fontWeight: '600' }]} numberOfLines={1}>{track.title}</Text>
          <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{track.artist}</Text>
        </View>
      </View>
      <FormError message={error} />

      {live.length > 0 && (<><SectionHeader>Şu an canlı</SectionHeader><Group>{live.map(row)}</Group></>)}
      {later.length > 0 && (<><SectionHeader>Yaklaşan</SectionHeader><Group>{later.map(row)}</Group></>)}
      {!mine.loading && !invited.loading && !pub.loading && all.length === 0 && (
        <Text style={[type.subhead, { color: colors.secondary, marginTop: 24 }]}>Açık parti yok. Jam sekmesinden bir tane başlatabilirsin.</Text>
      )}
    </Screen>
  );
}
