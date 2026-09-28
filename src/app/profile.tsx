import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { Cover } from '@/components/Cover';
import { Icon } from '@/components/Icon';
import { Group, Pill, Row, Screen, SectionHeader, Tag, TextButton, TopBar } from '@/components/ui';
import { people } from '@/data/mock';
import { usePlayer } from '@/state/player';
import { colors, type } from '@/theme';

function Stat({ n, label, onPress, border }: { n: number; label: string; onPress?: () => void; border?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderLeftWidth: border ? StyleSheet.hairlineWidth : 0, borderLeftColor: colors.separator }}>
      <Text style={[type.title2, type.numeric, { fontWeight: '600', fontSize: 20 }]}>{n}</Text>
      <Text style={[type.footnote, { color: colors.secondary }]}>{label}</Text>
    </Pressable>
  );
}

export default function Profile() {
  const { track } = usePlayer();
  return (
    <Screen scroll>
      <TopBar right={<TextButton title="Düzenle" size={17} />} />

      <View style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Avatar person={people.me} size={96} />
        <Text style={[type.title2, { fontSize: 26, marginTop: 6 }]}>Yasir</Text>
        <Text style={[type.subhead, { color: colors.secondary }]}>@yasir</Text>
      </View>

      <View style={{ marginTop: 20, flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14 }}>
        <Stat n={12} label="arkadaş" onPress={() => router.push('/friends')} />
        <Stat n={3} label="liste" border />
        <Stat n={5} label="parti" border />
      </View>

      {/* Visibility tiers required by the subject: public / friends-only / private */}
      <SectionHeader icon="globe">Herkese açık</SectionHeader>
      <Group>
        <Row title="Ad" value="Yasir" />
        <View style={{ paddingVertical: 12, gap: 10 }}>
          <Text style={type.body}>Müzik zevki</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {['Indie', 'Elektronik', 'Anadolu Rock'].map((g) => <Tag key={g} label={g} />)}
          </View>
        </View>
      </Group>

      <SectionHeader icon="people">Sadece arkadaşlar</SectionHeader>
      <Group>
        <Row title="Şu an dinliyor" subtitle={`${track.title} · ${track.artist}`} height={60} left={<Cover cover={track.cover} size={40} radius={6} />} />
        <Row title="Şehir" value="İstanbul" />
      </Group>

      <SectionHeader icon="lock">Sadece sen</SectionHeader>
      <Group>
        <Row title="E-posta" value="yasir@ornek.com" />
        <Row title="Şifre" value="Değiştir" onPress={() => router.push('/forgot')} />
      </Group>

      <SectionHeader>Bağlı hesaplar</SectionHeader>
      <Group>
        <Row title="Google" height={52} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="check" size={14} color={colors.secondary} strokeWidth={2} /><Text style={[type.subhead, { color: colors.secondary }]}>Bağlı</Text></View>} />
        <Row title="Facebook" height={52} right={<Pill title="Bağla" height={32} style={{ paddingHorizontal: 14 }} />} />
      </Group>

      <Pill title="Çıkış yap" variant="secondary" style={{ marginTop: 32, borderRadius: 14 }} onPress={() => router.replace('/welcome')} />
    </Screen>
  );
}
