import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { api } from '@/api/client';
import { FieldVisibility } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Group, Pill, Row, Screen, SectionHeader, Tag, TextButton, TopBar } from '@/components/ui';
import { personOf } from '@/lib/people';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/state/auth';
import { colors, type } from '@/theme';

function Stat({ n, label, onPress, border }: { n: number | string; label: string; onPress?: () => void; border?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderLeftWidth: border ? StyleSheet.hairlineWidth : 0, borderLeftColor: colors.separator }}>
      <Text style={[type.title2, type.numeric, { fontWeight: '600', fontSize: 20 }]}>{n}</Text>
      <Text style={[type.footnote, { color: colors.secondary }]}>{label}</Text>
    </Pressable>
  );
}

const tiers = [
  { v: FieldVisibility.Public, title: 'Herkese açık', icon: 'globe' },
  { v: FieldVisibility.Friends, title: 'Sadece arkadaşlar', icon: 'people' },
  { v: FieldVisibility.Private, title: 'Sadece sen', icon: 'lock' },
] as const;

const fieldLabels = { realName: 'Ad soyad', bio: 'Hakkında', location: 'Şehir', birthDate: 'Doğum tarihi' } as const;

export default function Profile() {
  const { me, signOut, reloadMe } = useAuth();
  const info = useAsync(() => api.me.userInfo());
  const friends = useAsync(() => api.friends.list({ pageSize: 100 }));
  const lists = useAsync(() => api.playlists.list('mine', { pageSize: 100 }));
  const events = useAsync(() => api.events.list('mine', { pageSize: 100 }));
  const links = useAsync(() => api.auth.socialLinks());

  // Coming back from the edit screen should show the new values.
  useFocusEffect(useCallback(() => { reloadMe().catch(() => {}); }, [reloadMe]));

  if (!me) return <Screen><TopBar /></Screen>;
  const fields = (Object.keys(fieldLabels) as (keyof typeof fieldLabels)[]).map((k) => ({ key: k, ...me[k] }));

  return (
    <Screen scroll>
      <TopBar right={<TextButton title="Düzenle" size={17} onPress={() => router.push('/profile-edit')} />} />

      <View style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Avatar person={personOf(me.displayName)} size={96} />
        <Text style={[type.title2, { fontSize: 26, marginTop: 6 }]}>{me.displayName}</Text>
      </View>

      <View style={{ marginTop: 20, flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14 }}>
        <Stat n={friends.data?.length ?? '–'} label="arkadaş" onPress={() => router.push('/friends')} />
        <Stat n={lists.data?.length ?? '–'} label="liste" border />
        <Stat n={events.data?.length ?? '–'} label="parti" border />
      </View>

      {tiers.map(({ v, title, icon }) => {
        const mine = fields.filter((f) => f.visibility === v && f.value);
        return (
          <View key={v}>
            <SectionHeader icon={icon}>{title}</SectionHeader>
            <Group>
              {v === FieldVisibility.Public && <Row title="Kullanıcı adı" value={me.displayName} />}
              {mine.map((f) => <Row key={f.key} title={fieldLabels[f.key]} value={f.value as string} />)}
              {v === FieldVisibility.Private && (
                <>
                  {info.data?.email ? <Row title="E-posta" value={info.data.email} /> : null}
                  <View style={{ paddingVertical: 12, gap: 10 }}>
                    <Text style={type.body}>Müzik zevki</Text>
                    {me.genres.length || me.artists.length
                      ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{[...me.genres, ...me.artists].map((g) => <Tag key={g} label={g} />)}</View>
                      : <Text style={[type.subhead, { color: colors.secondary }]}>Henüz seçmedin.</Text>}
                  </View>
                  <Row title="Şifre" value="Değiştir" onPress={() => router.push('/change-password')} />
                  <Row title="Oturumlar" value="Cihazlar" onPress={() => router.push('/sessions')} />
                </>
              )}
              {v !== FieldVisibility.Private && v !== FieldVisibility.Public && mine.length === 0 && (
                <Text style={[type.subhead, { color: colors.secondary, paddingVertical: 14 }]}>Bu bölümde paylaştığın bir bilgi yok.</Text>
              )}
            </Group>
          </View>
        );
      })}

      {(links.data?.length ?? 0) > 0 && (
        <>
          <SectionHeader>Bağlı hesaplar</SectionHeader>
          <Group>
            {links.data!.map((l) => (
              <Row key={l.provider} title={l.provider[0].toUpperCase() + l.provider.slice(1)} height={52}
                right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="check" size={14} color={colors.secondary} strokeWidth={2} /><Text style={[type.subhead, { color: colors.secondary }]}>Bağlı</Text></View>} />
            ))}
          </Group>
        </>
      )}

      <Pill title="Çıkış yap" variant="secondary" style={{ marginTop: 32, borderRadius: 14 }} onPress={async () => { await signOut(); router.replace('/welcome'); }} />
    </Screen>
  );
}
