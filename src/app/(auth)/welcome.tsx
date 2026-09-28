import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Cover } from '@/components/Cover';
import { Disc } from '@/components/Disc';
import { Orbit } from '@/components/Motion';
import { Pill, Screen, TextButton } from '@/components/ui';
import { CoverKey } from '@/data/mock';
import { colors, type } from '@/theme';

const ring: CoverKey[] = ['moons', 'summer', 'laundry', 'slowmo', 'dialup'];

export default function Welcome() {
  return (
    <Screen dark>
      <StatusBar style="light" />
      <View style={{ height: 360, marginTop: 40, marginHorizontal: -20, alignItems: 'center', justifyContent: 'center' }}>
        <Orbit
          diameter={340}
          duration={40000}
          ringStyle={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
          items={ring.map((k) => ({
            key: k, size: 40,
            node: <View style={{ borderRadius: 20, borderWidth: 2, borderColor: colors.black }}><Cover cover={k} size={40} radius={20} /></View>,
          }))}
        />
        <Disc cover="night" size={220} spinning label={0.55} holeColor={colors.black} glow={{ color: '#FF6B57', radius: 45 }} />
      </View>

      <Text accessibilityRole="header" style={[type.hero, { color: colors.white, marginTop: 36, fontSize: 40 }]}>music-room</Text>
      <Text style={{ fontSize: 19, lineHeight: 26, color: colors.darkSecondary, marginTop: 10 }}>
        Birlikte dinle. Sırayı birlikte kur. Aux’u istediğine ver.
      </Text>

      <View style={{ marginTop: 'auto', gap: 4 }}>
        <Pill title="Hesap oluştur" variant="light" height={56} onPress={() => router.push('/signup')} />
        <View style={{ alignItems: 'center' }}>
          <TextButton title="Giriş yap" dark weight="600" size={17} onPress={() => router.push('/login')} />
        </View>
        <Text style={{ fontSize: 12, lineHeight: 17, color: colors.darkSecondary, textAlign: 'center', marginTop: 4 }}>
          Devam ederek Kullanım Koşulları’nı ve Gizlilik Politikası’nı kabul etmiş olursun.
        </Text>
      </View>
    </Screen>
  );
}
