import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { EventSummary, Visibility } from '@/api/types';
import { Blink } from '@/components/Blink';
import { Icon } from '@/components/Icon';
import { hm, liveAt, LiveCard, openParty as open, StartCard } from '@/components/PartyCards';
import { FormError, Group, Pill, SectionHeader } from '@/components/ui';
import { useAsync } from '@/lib/useAsync';
import { colors, type } from '@/theme';
import { useTabInset } from '@/components/MiniPlayer';
import { readable } from '@/lib/layout';

const dayLabel = (iso: string, now: number) => {
  const d = new Date(iso);
  const today = new Date(now);
  const tomorrow = new Date(now + 86400e3);
  if (d.toDateString() === today.toDateString()) return 'BUGÜN';
  if (d.toDateString() === tomorrow.toDateString()) return 'YARIN';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }).toLocaleUpperCase('tr-TR');
};

/** Calendar-style block: live, or day + time. */
function DateBlock({ e, now }: { e: EventSummary; now: number }) {
  if (liveAt(e, now)) {
    return (
      <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Blink><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4D4D' }} /></Blink>
        <Text style={[type.caption, { color: colors.white, fontWeight: '700', fontSize: 10, letterSpacing: 1 }]}>CANLI</Text>
      </View>
    );
  }
  return (
    <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[type.caption, { color: colors.secondary, fontWeight: '700', fontSize: 10, letterSpacing: 0.8 }]}>{dayLabel(e.startsAtUtc, now)}</Text>
      <Text style={[type.headline, type.numeric, { fontSize: 16 }]}>{hm(e.startsAtUtc)}</Text>
    </View>
  );
}

function EventRow({ e, now }: { e: EventSummary; now: number }) {
  const live = liveAt(e, now);
  return (
    <Pressable accessibilityRole="button" onPress={() => open(e)} style={({ pressed }) => ({ height: 76, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.6 : 1 })}>
      <DateBlock e={e} now={now} />
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>{e.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Icon name={e.visibility === Visibility.Public ? 'globe' : 'lock'} size={12} color={colors.secondary} strokeWidth={2} />
          <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>
            {e.visibility === Visibility.Public ? 'Herkese açık' : 'Özel'} · {live ? `${hm(e.endsAtUtc)}’e kadar` : `${hm(e.startsAtUtc)}–${hm(e.endsAtUtc)}`}
          </Text>
        </View>
      </View>
      <Icon name="right" size={14} color={colors.tertiary} />
    </Pressable>
  );
}

function Section({ title, items, now }: { title: string; items: EventSummary[]; now: number }) {
  if (items.length === 0) return null;
  return (
    <>
      <SectionHeader>{title}</SectionHeader>
      <Group>{items.map((e) => <EventRow key={e.eventId} e={e} now={now} />)}</Group>
    </>
  );
}

export default function Jam() {
  const tabInset = useTabInset();
  const mine = useAsync(() => api.events.list('mine', { pageSize: 50 }));
  const invited = useAsync(() => api.events.list('invited', { pageSize: 50 }));
  const pub = useAsync(() => api.events.list('public', { pageSize: 50 }));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useFocusEffect(useCallback(() => { setNow(Date.now()); mine.reload(); invited.reload(); pub.reload(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = (l: EventSummary[] | null) => (l ?? []).filter((e) => now <= +new Date(e.endsAtUtc)).sort((a, b) => +new Date(a.startsAtUtc) - +new Date(b.startsAtUtc));
  const seen = new Set<string>();
  const dedupe = (l: EventSummary[]) => l.filter((e) => (seen.has(e.eventId) ? false : (seen.add(e.eventId), true)));
  const mineL = dedupe(upcoming(mine.data));
  const invitedL = dedupe(upcoming(invited.data));
  const pubL = dedupe(upcoming(pub.data));
  const hero = [...mineL, ...invitedL, ...pubL].find((e) => liveAt(e, now));
  const loading = mine.loading || invited.loading || pub.loading;
  const error = mine.error ?? invited.error ?? pub.error;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ ...readable, paddingHorizontal: 20, paddingBottom: tabInset }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Pill title="Yeni parti" height={36} style={{ paddingHorizontal: 14 }} left={<Icon name="plus" size={14} color={colors.white} />} onPress={() => router.push('/party/rules')} />
        </View>
        <Text accessibilityRole="header" style={type.largeTitle}>Jam</Text>
        <Text style={[type.subhead, { color: colors.secondary, marginTop: 4 }]}>Birlikte sıra kurun, oylayın, en sevilen çalsın.</Text>
        {error ? <FormError message={describeError(error)} /> : null}

        {hero ? <LiveCard e={hero} /> : !loading && <StartCard />}

        <Section title="Partilerin" items={mineL.filter((e) => e !== hero)} now={now} />
        <Section title="Davetlisin" items={invitedL.filter((e) => e !== hero)} now={now} />
        <Section title="Keşfet" items={pubL.filter((e) => e !== hero)} now={now} />

        {hero && <View style={{ marginTop: 8 }}><StartCard /></View>}
      </ScrollView>
    </SafeAreaView>
  );
}
