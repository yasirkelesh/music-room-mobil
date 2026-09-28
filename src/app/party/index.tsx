import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { Disc } from '@/components/Disc';
import { Icon } from '@/components/Icon';
import { Orbit } from '@/components/Motion';
import { Blink } from '@/components/Blink';
import { Pill, Progress, Screen, TextButton } from '@/components/ui';
import { covers, people, tracks } from '@/data/mock';
import { colors, type } from '@/theme';

const inner = [people.elif, people.me, people.mert, people.deniz, people.kaan];
const outer = ['a', 's', 'b', 'o', 't', 'z', 'c'];

export default function Party() {
  const now = tracks.slowmo;
  const art = covers[now.cover];
  return (
    <Screen dark>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextButton title="Çık" dark onPress={() => router.back()} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Blink><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white }} /></Blink>
          <Text style={[type.headline, { color: colors.white, fontSize: 15 }]}>PARTİ</Text>
        </View>
      </View>

      <Text accessibilityRole="header" style={[type.hero, { color: colors.white, fontSize: 40, marginTop: 12 }]}>Bant’ta Cuma</Text>
      <Text style={[type.subhead, { color: colors.darkSecondary, marginTop: 6 }]}>İçeride 42 kişi · aux Elif’te</Text>

      {/* the record spins; guests orbit it. Inner ring = friends, outer ring = everyone else */}
      <View style={{ height: 390, marginHorizontal: -20, marginTop: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Orbit
          diameter={370}
          duration={48000}
          reverse
          ringStyle={{ borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.14)' }}
          items={outer.map((l, i) => ({
            key: l, size: 24,
            node: <Avatar person={{ initial: l, tone: 'graphite' }} size={24} override={i % 2 ? { bg: colors.black, fg: colors.white } : undefined} ring={i % 2 ? 'rgba(255,255,255,0.5)' : undefined} />,
          }))}
        />
        <Orbit
          diameter={300}
          duration={30000}
          ringStyle={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
          items={inner.map((p, i) => ({
            key: p.id, size: 36,
            node: i === 0
              ? <View style={{ borderRadius: 22, padding: 4, backgroundColor: 'rgba(255,255,255,0.25)' }}><Avatar person={p} size={36} override={{ bg: colors.white, fg: colors.black }} /></View>
              : <Avatar person={p} size={36} override={p.tone === 'ink' ? { bg: colors.chromeLight, fg: colors.black } : undefined} />,
          }))}
        />
        <View style={{ shadowColor: art.ink, shadowOpacity: 0.4, shadowRadius: 45, shadowOffset: { width: 0, height: 0 } }}>
          <Disc cover={now.cover} size={220} spinning label={0.55} holeColor={colors.black} />
        </View>
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={[type.title2, { color: colors.white, fontWeight: '600' }]}>{now.title}</Text>
          <Text style={[type.subhead, { color: colors.darkSecondary }]}>{now.artist}</Text>
        </View>
        <Text style={[type.headline, type.numeric, { color: colors.white }]}>2:10</Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Progress ratio={0.55} color={colors.white} track="rgba(255,255,255,0.2)" dot={art.ink} />
      </View>

      <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 10 }}>
        <Pill title="Sıradakini oyla" variant="light" height={56} style={{ flex: 1 }} onPress={() => router.push('/party/vote')} />
        <Pressable accessibilityRole="button" accessibilityLabel="Tepki gönder" style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" color={colors.white} size={20} />
        </Pressable>
      </View>
    </Screen>
  );
}
