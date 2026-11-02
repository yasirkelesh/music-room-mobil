import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/api/client';
import type { EventSummary } from '@/api/types';
import { paletteOf, thumbnail } from '@/lib/tracks';
import { useAsync } from '@/lib/useAsync';
import { colors, type } from '@/theme';
import { Blink } from './Blink';
import { Cover } from './Cover';
import { Icon } from './Icon';
import { dark, Glow } from './Party';
import { Pill } from './ui';

export const hm = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
export const liveAt = (e: EventSummary, now: number) => now >= +new Date(e.startsAtUtc) && now <= +new Date(e.endsAtUtc);
export const openParty = (e: EventSummary) => router.push({ pathname: '/party/[id]', params: { id: e.eventId } });

/** The party happening right now, big: what is queued and a way in. */
export function LiveCard({ e }: { e: EventSummary }) {
  const queue = useAsync(() => api.events.queue(e.eventId, { pageSize: 4 }), [e.eventId]);
  const top = (queue.data ?? []).slice(0, 3);
  const glow = top[0] ? paletteOf({ id: top[0].youtubeVideoId, cover: { uri: thumbnail(top[0].youtubeVideoId) } }).base : '#3A3A3C';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${e.name}, canlı parti, katıl`} onPress={() => openParty(e)}
      style={({ pressed }) => ({ marginTop: 20, borderRadius: 28, backgroundColor: colors.black, overflow: 'hidden', padding: 20, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <Glow color={glow} height={260} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Blink><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4D4D' }} /></Blink>
        <Text style={[type.caption, { color: colors.white, fontWeight: '700', letterSpacing: 1.4 }]}>CANLI</Text>
        <Text style={[type.caption, { color: dark.sub }]}>· {hm(e.endsAtUtc)}’e kadar</Text>
      </View>
      <Text style={[type.hero, { color: colors.white, fontSize: 32, lineHeight: 36, marginTop: 10 }]} numberOfLines={2}>{e.name}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
        <View style={{ flexDirection: 'row' }}>
          {top.length === 0 && <View style={{ width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: dark.faint }} />}
          {top.map((q, i) => (
            <View key={q.suggestionId} style={{ marginLeft: i ? -14 : 0, borderRadius: 11, borderWidth: 2, borderColor: colors.black, transform: [{ rotate: `${(i - 1) * 4}deg` }] }}>
              <Cover cover={{ uri: thumbnail(q.youtubeVideoId) }} size={48} radius={9} />
            </View>
          ))}
        </View>
        <Text style={[type.subhead, { color: dark.sub, marginLeft: 12, flex: 1 }]}>
          {queue.data ? (queue.data.length ? `${queue.data.length}${queue.data.length === 4 ? '+' : ''} şarkı sırada` : 'Sıra boş, ilk şarkıyı sen ekle') : ' '}
        </Text>
      </View>

      <Pill title="Katıl" variant="light" height={48} style={{ marginTop: 18 }} onPress={() => openParty(e)} />
    </Pressable>
  );
}

export function StartCard() {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/party/rules')}
      style={({ pressed }) => ({ marginTop: 20, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.separator, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={22} color={colors.white} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.headline}>Yeni parti başlat</Text>
        <Text style={[type.footnote, { color: colors.secondary, marginTop: 2, lineHeight: 18 }]}>Arkadaşlarını çağır, sırayı birlikte kurun, en çok oy alan çalsın.</Text>
      </View>
    </Pressable>
  );
}

