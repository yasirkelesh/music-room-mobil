import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Blink } from '@/components/Blink';
import { Cover } from '@/components/Cover';
import { Disc } from '@/components/Disc';
import { Icon } from '@/components/Icon';
import { BackButton, Pill, Screen, TextButton } from '@/components/ui';
import { tracks } from '@/data/mock';
import { colors, type } from '@/theme';

/**
 * V.2.1 Music Track Vote — a live chain ordered by votes.
 * Concurrency: one vote per user per track (tapping again removes it), votes are
 * applied server-side in arrival order and the new order is broadcast; ties keep
 * the earlier suggestion first. `sync` mirrors what the socket would tell us.
 */
type Item = { id: string; by: string; base: number; mine: 0 | 1 | -1; order: number };

export default function Vote() {
  const [items, setItems] = useState<Item[]>([
    { id: 'moons', by: 'elif', base: 11, mine: 1, order: 0 },
    { id: 'laundry', by: 'bir misafir', base: 9, mine: 0, order: 1 },
    { id: 'dialup', by: 'mert', base: 7, mine: 0, order: 2 },
    { id: 'floppy', by: 'sen', base: 4, mine: 0, order: 3 },
    { id: 'summer', by: 'deniz', base: 2, mine: 0, order: 4 },
  ]);
  const [sync, setSync] = useState('Aynı anda 3 oy geldi · hepsi sayıldı, sıra güncellendi');

  const vote = (id: string, dir: 1 | -1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, mine: x.mine === dir ? 0 : dir } : x)));
    setSync('Oyun alındı · aynı anda 2 kişi daha oyladı, hepsi sayıldı');
    // TODO: api.vote(eventId, id, next)
  };

  const chain = items
    .map((x) => ({ ...x, votes: x.base + x.mine }))
    .sort((a, b) => b.votes - a.votes || a.order - b.order);
  const now = tracks.slowmo;

  return (
    <Screen dark scroll>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton dark label="Partiye dön" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Blink><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white }} /></Blink>
          <Text style={[type.headline, { color: colors.white, fontSize: 15 }]}>OYLA</Text>
        </View>
      </View>

      <Text accessibilityRole="header" style={[type.hero, { color: colors.white, fontSize: 40, marginTop: 12 }]}>Sırada ne çalsın</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="pin" size={14} color={colors.darkSecondary} />
        <Text style={[type.footnote, { color: colors.darkSecondary, flex: 1 }]}>Herkese açık · 16:00–18:00 arası buradakiler oylar</Text>
        <TextButton title="Kurallar" dark size={13} onPress={() => router.push('/party/rules')} />
      </View>

      <View style={{ marginTop: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 0.5, borderBottomColor: colors.darkHairline }}>
        <Disc cover={now.cover} size={52} finish="picture" spinning holeColor={colors.black} />
        <View style={{ flex: 1 }}>
          <Text style={[type.caption, { color: colors.darkSecondary }]}>Şimdi</Text>
          <Text style={[type.body, { color: colors.white, fontWeight: '500' }]}>{now.title}</Text>
          <Text style={[type.footnote, { color: colors.darkSecondary }]}>{now.artist}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[type.caption, { color: colors.darkSecondary }]}>sonraki</Text>
          <Text style={[type.title2, type.numeric, { color: colors.white, fontWeight: '600', fontSize: 20 }]}>1:48</Text>
        </View>
      </View>

      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Blink><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white }} /></Blink>
        <Text style={[type.footnote, { color: colors.darkSecondary }]}>{sync}</Text>
      </View>

      <View style={{ marginTop: 6 }}>
        <View style={{ position: 'absolute', left: 5, top: 34, bottom: 34, width: 1, backgroundColor: 'rgba(255,255,255,0.25)' }} />
        {chain.map((t, i) => {
          const tr = tracks[t.id];
          return (
            <Animated.View key={t.id} layout={LinearTransition.springify().damping(18)} style={{ height: 68, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: i === 0 ? colors.white : colors.black, borderWidth: i === 0 ? 0 : 1, borderColor: 'rgba(255,255,255,0.5)' }} />
              <Cover cover={tr.cover} size={40} radius={6} />
              <View style={{ flex: 1 }}>
                <Text style={[type.callout, { color: colors.white, fontWeight: '500' }]} numberOfLines={1}>{tr.title}</Text>
                <Text style={[type.footnote, { color: colors.darkSecondary }]} numberOfLines={1}>{tr.artist} · {t.by}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${tr.title} için artı oy`} accessibilityState={{ selected: t.mine === 1 }} onPress={() => vote(t.id, 1)} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="up" size={12} color={t.mine === 1 ? colors.white : 'rgba(255,255,255,0.45)'} />
              </Pressable>
              <Text style={[type.headline, type.numeric, { color: colors.white, width: 26, textAlign: 'center' }]}>{t.votes}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`${tr.title} için eksi oy`} accessibilityState={{ selected: t.mine === -1 }} onPress={() => vote(t.id, -1)} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="downTri" size={12} color={t.mine === -1 ? colors.white : 'rgba(255,255,255,0.45)'} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Pill title="Şarkı öner" variant="light" height={56} style={{ marginTop: 24 }} />
    </Screen>
  );
}
