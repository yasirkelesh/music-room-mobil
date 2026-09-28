import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Disc } from '@/components/Disc';
import { LiveDot, Pill, Screen, TextButton, Toggle, TopBar } from '@/components/ui';
import { nearbyRoom, tracks } from '@/data/mock';
import { colors, type } from '@/theme';

/** Entering a venue: join the playlist that's already playing there. */
export default function Nearby() {
  const [bring, setBring] = useState(true);
  const now = tracks[nearbyRoom.nowPlaying];
  return (
    <Screen>
      <TopBar right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><LiveDot /><Text style={[type.footnote, { color: colors.secondary }]}>{nearbyRoom.distanceM} m uzakta</Text></View>} />

      <Text style={{ marginTop: 56, fontSize: 20, color: colors.secondary }}>Şu an buradasın</Text>
      <Text accessibilityRole="header" style={[type.hero, { fontSize: 56, lineHeight: 58 }]}>{nearbyRoom.name}.</Text>
      <Text style={[type.subhead, { color: colors.secondary, marginTop: 6 }]}>{nearbyRoom.place}</Text>

      <View style={{ marginTop: 40, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.separator }}>
        <View style={{ flex: 1, paddingVertical: 18 }}>
          <Text style={[type.numeric, { fontSize: 48, fontWeight: '600' }]}>{nearbyRoom.listeners}</Text>
          <Text style={[type.footnote, { color: colors.secondary }]}>dinliyor</Text>
        </View>
        <View style={{ flex: 1, paddingVertical: 18, paddingLeft: 20, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.separator }}>
          <Text style={[type.numeric, { fontSize: 48, fontWeight: '600' }]}>{nearbyRoom.queued}</Text>
          <Text style={[type.footnote, { color: colors.secondary }]}>sırada</Text>
        </View>
      </View>

      <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Disc cover={now.cover} size={44} finish="picture" spinning />
        <View>
          <Text style={[type.callout, { fontWeight: '500' }]}>{now.title}</Text>
          <Text style={[type.footnote, { color: colors.secondary }]}>{now.artist} · {nearbyRoom.playlist}</Text>
        </View>
      </View>

      <View style={{ marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={[type.callout, { fontWeight: '500' }]}>İki şarkımı da ekle</Text>
          <Text style={[type.footnote, { color: colors.secondary }]}>Seninle birlikte sıraya girerler</Text>
        </View>
        <Toggle value={bring} onChange={setBring} label="İki şarkımı da ekle" />
      </View>

      <View style={{ marginTop: 'auto', gap: 4 }}>
        <Pill title="Sıraya katıl" height={56} left={<LiveDot color={colors.white} size={8} />} onPress={() => router.replace('/party/vote')} />
        <View style={{ alignItems: 'center' }}><TextButton title="Sadece dinle" size={15} onPress={() => router.back()} /></View>
      </View>
    </Screen>
  );
}
