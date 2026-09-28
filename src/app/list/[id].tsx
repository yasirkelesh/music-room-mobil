import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Avatar } from '@/components/Avatar';
import { Shelf, ShelfItem } from '@/components/Jukebox';
import { Icon } from '@/components/Icon';
import { Pill, Screen, TextButton, TopBar } from '@/components/ui';
import { people, playlists, slotCode, tracks } from '@/data/mock';
import { colors, type } from '@/theme';

type Log = { id: number; t: string; msg: string };

/**
 * V.2.3 Real-time multi-user playlist editing.
 * Conflict rule shown here: a record is locked to whoever picks it up first;
 * others get a notice and their move waits. The server should enforce the same
 * with a per-track lock + playlist version check (see api.moveTrack).
 */
export default function LiveList() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pl = playlists.find((p) => p.id === id) ?? playlists[0];
  const [items, setItems] = useState<ShelfItem[]>(
    pl.trackIds.map((tid) => ({ id: tid, track: tracks[tid], heldBy: tid === 'summer' ? 'Elif' : undefined })),
  );
  const [mine, setMine] = useState<string | undefined>('night');
  const [toast, setToast] = useState<string | null>('“Late Summer” plağını Elif senden bir an önce aldı. O bırakınca serbest kalacak.');
  const [log, setLog] = useState<Log[]>([
    { id: 3, t: 'ŞİMDİ', msg: 'Elif “Late Summer” plağını taşıyor' },
    { id: 2, t: '12SN', msg: 'Mert “Dial-up Heart” plağını B2’ye ekledi' },
    { id: 1, t: '1DK', msg: '“Paper Moons” plağını A1’e taşıdın' },
  ]);

  const warn = (msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setToast(msg);
  };

  const pick = (it: ShelfItem) => {
    if (it.heldBy) return warn(`“${it.track.title}” plağını şu an ${it.heldBy} taşıyor. O bırakınca serbest kalacak.`);
    setMine(it.id);
    setToast(null);
  };

  const move = (dir: -1 | 1) => {
    const i = items.findIndex((x) => x.id === mine);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    if (items[j].heldBy) return warn(`“${items[j].track.title}” şu an ${items[j].heldBy}’in elinde. O bırakınca tekrar dene.`);
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    setLog((l) => [{ id: Date.now(), t: 'ŞİMDİ', msg: `“${items[i].track.title}” plağını ${slotCode(j)} yuvasına taşıdın` }, ...l.map((x) => (x.t === 'ŞİMDİ' ? { ...x, t: '2SN' } : x))].slice(0, 3));
  };

  const selIndex = items.findIndex((x) => x.id === mine);
  const sel = selIndex >= 0 ? items[selIndex] : undefined;

  return (
    <Screen scroll>
      <TopBar
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row' }}>
              {[people.me, people.elif, people.mert].map((p, i) => (
                <View key={p.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar person={p} size={30} ring={colors.bg} /></View>
              ))}
            </View>
            <Text style={type.footnote}>3 kişi düzenliyor</Text>
          </View>
        }
      />

      <Text accessibilityRole="header" style={[type.largeTitle, { marginTop: 12 }]}>{pl.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[type.footnote, { color: colors.secondary }]}>Herkese açık radyo · herkes düzenleyebilir</Text>
        <TextButton title="Kurallar" size={13} onPress={() => router.push('/list/new')} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Shelf items={items} mineId={mine} onPick={pick} />
      </View>

      <View style={{ marginTop: 16, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {sel ? (
          <>
            <Text style={[type.title2, type.numeric, { width: 36, fontWeight: '600' }]}>{slotCode(selIndex)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[type.subhead, { fontWeight: '600' }]} numberOfLines={1}>{sel.track.title}</Text>
              <Text style={[type.caption, { color: colors.secondary }]}>elinde</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Sola taşı" onPress={() => move(-1)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center' }}><Icon name="left" size={16} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Sağa taşı" onPress={() => move(1)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center' }}><Icon name="right" size={16} /></Pressable>
            <Pill title="Bırak" height={44} style={{ paddingHorizontal: 16 }} onPress={() => setMine(undefined)} />
          </>
        ) : (
          <Text style={[type.subhead, { color: colors.secondary }]}>Taşımak için bir plağa dokunup al.</Text>
        )}
      </View>

      {toast && (
        <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut} style={{ marginTop: 10, borderRadius: 18, backgroundColor: colors.label, paddingVertical: 12, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} />
          <Text style={[type.subhead, { flex: 1, color: colors.white, lineHeight: 20 }]}>{toast}</Text>
          <TextButton title="Tamam" dark onPress={() => setToast(null)} />
        </Animated.View>
      )}

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 20, marginBottom: 6 }]}>Canlı</Text>
      {log.map((l) => (
        <Animated.View key={l.id} entering={FadeInDown} layout={LinearTransition} style={{ height: 34, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 0.5, borderTopColor: colors.hairline }}>
          <Text style={[type.caption, type.numeric, { width: 44, fontWeight: '600', color: colors.secondary }]}>{l.t}</Text>
          <Text style={[type.subhead, { flex: 1 }]} numberOfLines={1}>{l.msg}</Text>
        </Animated.View>
      ))}

      <Pill title="Plak ekle" style={{ marginTop: 24 }} onPress={() => router.push('/list/new')} />
    </Screen>
  );
}
