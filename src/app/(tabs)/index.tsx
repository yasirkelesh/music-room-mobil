import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Mosaic } from '@/components/Cover';
import { Group, LiveDot, Pill, TextButton } from '@/components/ui';
import { nearbyRoom, people, playlists, tracks } from '@/data/mock';
import { colors, TAB_INSET, type } from '@/theme';

export default function Home() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_INSET }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LiveDot size={8} />
            <Text style={[type.headline, { fontSize: 15 }]}>music-room</Text>
          </View>
          <Link href="/profile" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Profil"><Avatar person={people.me} size={40} /></Pressable>
          </Link>
        </View>

        <View style={{ marginTop: 56, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LiveDot />
            <Text style={[type.footnote, { color: colors.secondary }]}>yakınında çalıyor</Text>
          </View>
          <Text accessibilityRole="header" style={[type.hero, { fontSize: 52, lineHeight: 54 }]}>{nearbyRoom.name}</Text>
          <Text style={[type.subhead, { color: colors.secondary }]}>{nearbyRoom.playlist} · {nearbyRoom.listeners} kişi dinliyor</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pill title="Katıl" height={48} onPress={() => router.push('/room/nearby')} />
            <Pill title="Sadece dinle" variant="outline" height={48} />
          </View>
        </View>

        <View style={{ marginTop: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={type.title2}>Listelerin</Text>
          <TextButton title="Yeni +" onPress={() => router.push('/list/new')} />
        </View>
        <Group style={{ marginTop: 8 }}>
          {playlists.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/list/[id]', params: { id: p.id } })} style={({ pressed }) => ({ height: 64, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.6 : 1 })}>
              <Mosaic items={p.trackIds.map((id) => tracks[id].cover)} size={44} />
              <Text style={[type.body, { flex: 1, fontWeight: '500' }]}>{p.name}</Text>
              <Text style={[type.footnote, { color: colors.secondary }]}>{p.sharedWith ? `${p.sharedWith} kişiyle` : `${p.trackIds.length} şarkı`}</Text>
            </Pressable>
          ))}
        </Group>

        <Pressable accessibilityRole="button" onPress={() => router.push('/party')} style={{ marginTop: 16, borderRadius: 14, backgroundColor: colors.black, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LiveDot color={colors.white} size={8} />
          <View style={{ flex: 1 }}>
            <Text style={[type.headline, { color: colors.white }]}>Bant’ta Cuma</Text>
            <Text style={[type.footnote, { color: colors.darkSecondary }]}>Parti şu an canlı · 42 kişi</Text>
          </View>
          <Text style={[type.subhead, { color: colors.white, fontWeight: '600' }]}>Gir</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
