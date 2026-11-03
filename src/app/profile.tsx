import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { FieldVisibility } from '@/api/types';
import { showActions } from '@/components/ActionSheet';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { Choice, FormError, Group, Pill, Row, Screen, SectionHeader, Tag, TopBar } from '@/components/ui';
import { personOf } from '@/lib/people';
import { displayAddress } from '@/lib/serverAddress';
import { googleCode, googleReady } from '@/lib/social';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/state/auth';
import { colors, radius, type } from '@/theme';

const tierIcon: Record<FieldVisibility, IconName> = {
  [FieldVisibility.Public]: 'globe',
  [FieldVisibility.Friends]: 'people',
  [FieldVisibility.Private]: 'lock',
};
const tierLabel: Record<FieldVisibility, string> = {
  [FieldVisibility.Public]: 'Herkes görür',
  [FieldVisibility.Friends]: 'Arkadaşların görür',
  [FieldVisibility.Private]: 'Sadece sen görürsün',
};

const fieldLabels = { realName: 'Ad soyad', location: 'Şehir', birthDate: 'Doğum tarihi', bio: 'Hakkında' } as const;
type FieldKey = keyof typeof fieldLabels;

/** Whose eyes the profile is shown through. A field shows when its visibility is at most the viewer's tier. */
type Viewer = 'me' | 'friend' | 'public';
const viewerTier: Record<Viewer, FieldVisibility> = { me: FieldVisibility.Private, friend: FieldVisibility.Friends, public: FieldVisibility.Public };

/** The avatar is the label of a black record. Static: a spinning profile picture is just noise. */
function RecordAvatar({ name, size = 136 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Circle cx={50} cy={50} r={49.5} fill={colors.vinyl} />
        {[46, 42, 38, 34].map((g, i) => (
          <Circle key={g} cx={50} cy={50} r={g} fill="none" stroke={colors.vinylGroove} strokeWidth={0.4} opacity={i % 2 ? 0.5 : 0.9} />
        ))}
        <Path d="M50 5 A45 45 0 0 1 86 24" fill="none" stroke={colors.white} strokeWidth={2.4} strokeLinecap="round" opacity={0.16} />
      </Svg>
      <Avatar person={personOf(name)} size={Math.round(size * 0.52)} override={{ bg: colors.chromeLight, fg: colors.label }} />
    </View>
  );
}

function Stat({ n, label, onPress }: { n: number | string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${n} ${label}`} onPress={onPress}
      style={({ pressed }) => ({ flex: 1, paddingVertical: 14, alignItems: 'center', gap: 2, borderRadius: radius.card, backgroundColor: colors.card, opacity: pressed ? 0.6 : 1 })}>
      <Text style={[type.title2, type.numeric]}>{n}</Text>
      <Text style={[type.footnote, { color: colors.secondary }]}>{label}</Text>
    </Pressable>
  );
}

/** Monochrome icon tile at the start of a settings row. */
function Tile({ icon }: { icon: IconName }) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={16} strokeWidth={2} />
    </View>
  );
}

const chevron = <Icon name="right" size={14} color={colors.tertiary} strokeWidth={2} />;

export default function Profile() {
  const { me, signOut, reloadMe } = useAuth();
  const info = useAsync(() => api.me.userInfo());
  const friends = useAsync(() => api.friends.list({ pageSize: 100 }));
  const lists = useAsync(() => api.playlists.list('mine', { pageSize: 100 }));
  const events = useAsync(() => api.events.list('mine', { pageSize: 100 }));
  const links = useAsync(() => api.auth.socialLinks());
  const google = links.data?.find((l) => l.provider === 'google') ?? null;
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>('me');

  // Linking proves the Google account is the caller's the same way signing in does: a fresh code.
  const linkGoogle = async () => {
    setLinking(true);
    setLinkError(null);
    try {
      const code = await googleCode();
      if (code) { await api.auth.linkSocial(code); links.reload(); }
    } catch (e) {
      setLinkError(e instanceof ApiError ? describeError(e) : 'Google hesabı bağlanamadı. Tekrar dene.');
    } finally {
      setLinking(false);
    }
  };
  const unlinkGoogle = () => showActions({ title: 'Google', subtitle: google?.email ?? undefined }, [{
    label: 'Bağlantıyı kaldır', icon: 'close', destructive: true,
    run: async () => {
      setLinkError(null);
      try { await api.auth.unlinkSocial('google'); links.reload(); } catch (e) { setLinkError(describeError(e)); }
    },
  }]);
  const confirmSignOut = () => showActions({ title: 'Çıkış yapılsın mı?', subtitle: me?.displayName }, [{
    label: 'Çıkış yap', icon: 'close', destructive: true,
    run: async () => { await signOut(); router.replace('/welcome'); },
  }]);

  // Coming back from the edit screen should show the new values.
  useFocusEffect(useCallback(() => { reloadMe().catch(() => {}); }, [reloadMe]));

  if (!me) return <Screen><TopBar /></Screen>;

  const tier = viewerTier[viewer];
  const shown = (k: FieldKey) => (me[k].value && me[k].visibility <= tier ? me[k].value : null);
  const subtitle = [shown('realName'), shown('location')].filter(Boolean).join(' · ');
  const bio = shown('bio');
  const rows = (Object.keys(fieldLabels) as FieldKey[]).filter((k) => k !== 'bio' && shown(k));
  const taste = [...me.genres, ...me.artists];
  const previewing = viewer !== 'me';
  const count = (d: unknown[] | undefined | null) => d?.length ?? '–';

  return (
    <Screen scroll>
      <TopBar />

      {/* ---------- who you are ---------- */}
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <RecordAvatar name={me.displayName} />
        <Text style={[type.title2, { fontSize: 28, marginTop: 16 }]} numberOfLines={1}>{me.displayName}</Text>
        {subtitle ? <Text style={[type.subhead, { color: colors.secondary, marginTop: 4 }]} numberOfLines={1}>{subtitle}</Text> : null}
        {bio ? <Text style={[type.callout, { textAlign: 'center', marginTop: 10, lineHeight: 22, maxWidth: 420 }]} numberOfLines={4}>{bio}</Text> : null}
        {!previewing && (
          <Pill title="Profili düzenle" variant="secondary" height={40} style={{ marginTop: 16, paddingHorizontal: 22 }}
            left={<Icon name="edit" size={16} strokeWidth={2} />} onPress={() => router.push('/profile-edit')} />
        )}
      </View>

      {/* ---------- preview: what others see ---------- */}
      <View style={{ marginTop: 20, alignItems: 'center' }}>
        <Choice<Viewer> value={viewer} onChange={setViewer} options={[
          { value: 'me', label: 'Sen' }, { value: 'friend', label: 'Arkadaş gözüyle' }, { value: 'public', label: 'Herkes gözüyle' },
        ]} />
      </View>

      {!previewing && (
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
          <Stat n={count(friends.data)} label="arkadaş" onPress={() => router.push('/friends')} />
          <Stat n={count(lists.data)} label="dolap" onPress={() => router.push('/lists')} />
          <Stat n={count(events.data)} label="parti" onPress={() => router.push('/jam')} />
        </View>
      )}

      {/* ---------- profile fields, each with who can see it ---------- */}
      <SectionHeader>{previewing ? (viewer === 'friend' ? 'Arkadaşların bunları görür' : 'Herkes bunları görür') : 'Bilgilerin'}</SectionHeader>
      <Group>
        <Row title="Kullanıcı adı" value={me.displayName} right={<Icon name={tierIcon[FieldVisibility.Public]} size={14} color={colors.tertiary} strokeWidth={2} />} />
        {rows.map((k) => (
          <Row key={k} title={fieldLabels[k]} value={me[k].value as string}
            right={<Icon name={tierIcon[me[k].visibility]} size={14} color={colors.tertiary} strokeWidth={2} />} />
        ))}
        {!previewing && (Object.keys(fieldLabels) as FieldKey[]).some((k) => !me[k].value) && (
          <Row title="Eksik bilgileri tamamla" onPress={() => router.push('/profile-edit')}
            left={<Icon name="plus" size={16} color={colors.secondary} strokeWidth={2} />} right={chevron} />
        )}
      </Group>
      {!previewing && <VisibilityLegend />}

      {!previewing && (
        <>
          {/* ---------- taste ---------- */}
          <SectionHeader icon="lock">Müzik zevkin</SectionHeader>
          <Pressable accessibilityRole="button" accessibilityLabel="Müzik zevkini düzenle" onPress={() => router.push({ pathname: '/taste', params: { edit: '1' } })}
            style={({ pressed }) => ({ backgroundColor: colors.card, borderRadius: radius.card, padding: 16, gap: 12, opacity: pressed ? 0.7 : 1 })}>
            {taste.length
              ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{taste.map((g) => <Tag key={g} label={g} />)}</View>
              : <Text style={[type.subhead, { color: colors.secondary }]}>Henüz seçmedin. Seçtiğin türlere göre öneri yaparız.</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[type.subhead, { fontWeight: '600' }]}>{taste.length ? 'Düzenle' : 'Tür seç'}</Text>
              {chevron}
            </View>
          </Pressable>

          {/* ---------- account ---------- */}
          <SectionHeader>Hesap</SectionHeader>
          <Group>
            {info.data?.email ? <Row title="E-posta" value={info.data.email} left={<Tile icon="mail" />} height={52} /> : null}
            <Row title="Şifre" left={<Tile icon="lock" />} height={52} right={chevron} onPress={() => router.push('/change-password')} />
            <Row title="Oturumlar" subtitle="Giriş yaptığın cihazlar" left={<Tile icon="laptop" />} height={52} right={chevron} onPress={() => router.push('/sessions')} />
            <Row title="Sunucu adresi" value={displayAddress()} left={<Tile icon="settings" />} height={52} right={chevron} onPress={() => router.push('/server')} />
            <Row title="Google" height={52} subtitle={google?.email ?? undefined}
              value={linking ? 'Bekleniyor…' : google ? 'Bağlı' : googleReady ? 'Bağla' : 'Ayarlanmadı'}
              left={<Tile icon={google ? 'check' : 'globe'} />}
              onPress={linking || (!google && !googleReady) ? undefined : google ? unlinkGoogle : linkGoogle} />
          </Group>
          <FormError message={linkError} />

          <Pressable accessibilityRole="button" onPress={confirmSignOut}
            style={({ pressed }) => ({ marginTop: 28, height: 52, borderRadius: radius.card, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Text style={[type.headline, { color: colors.danger }]}>Çıkış yap</Text>
          </Pressable>
        </>
      )}

      {previewing && (
        <Text style={[type.footnote, { color: colors.secondary, marginTop: 16, textAlign: 'center', lineHeight: 18 }]}>
          Önizleme. Müzik zevkin ve hesap bilgilerin sadece sana görünür.
        </Text>
      )}
    </Screen>
  );
}

function VisibilityLegend() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 8, marginHorizontal: 16 }}>
      {([FieldVisibility.Public, FieldVisibility.Friends, FieldVisibility.Private] as const).map((v) => (
        <View key={v} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name={tierIcon[v]} size={12} color={colors.secondary} strokeWidth={2} />
          <Text style={[type.caption, { color: colors.secondary }]}>{tierLabel[v]}</Text>
        </View>
      ))}
    </View>
  );
}
