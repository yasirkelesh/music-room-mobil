import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api, session as tokens } from '@/api/client';
import { describeError } from '@/api/errors';
import type { SessionInfo } from '@/api/types';
import { Icon, IconName } from '@/components/Icon';
import { FormError, Group, Pill, Screen, SectionHeader, Sub, Title, TopBar } from '@/components/ui';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/state/auth';
import { colors, type } from '@/theme';

/** The access token names its session in the `sid` claim; that is how "this device" is told apart. */
function currentSessionId(): string | null {
  const t = tokens.accessToken;
  if (!t) return null;
  try {
    const part = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(globalThis.atob(part + '='.repeat((4 - (part.length % 4)) % 4)));
    return typeof json.sid === 'string' ? json.sid : null;
  } catch {
    return null;
  }
}

const iconFor = (s: SessionInfo): IconName => (/mac|windows|linux|web/i.test(`${s.platform} ${s.device}`) ? 'laptop' : 'phone');
const when = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Where this account is signed in, and a way to end any of it. */
export default function Sessions() {
  const { signOut } = useAuth();
  const list = useAsync(() => api.auth.sessions());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = currentSessionId();
  const sessions = list.data ?? [];
  const others = sessions.filter((s) => s.sessionId !== current);

  const end = async (ids: string[]) => {
    setBusy(true);
    setError(null);
    try {
      // 404 means it already ended (or expired) — the outcome the user wanted.
      await Promise.all(ids.map((id) => api.auth.endSession(id).catch((e) => { if (!(e?.status === 404)) throw e; })));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
      list.reload();
    }
  };

  const confirmEnd = (s: SessionInfo) => Alert.alert('Oturumu kapat', `${s.device} cihazındaki oturum kapatılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kapat', style: 'destructive', onPress: () => end([s.sessionId]) },
  ]);

  const row = (s: SessionInfo) => {
    const mine = s.sessionId === current;
    return (
      <View key={s.sessionId} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: mine ? colors.label : colors.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={iconFor(s)} size={18} color={mine ? colors.white : colors.label} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.body, { fontWeight: '500' }]} numberOfLines={2}>{s.device || s.platform}{mine ? ' · bu cihaz' : ''}</Text>
          {/* two short lines instead of one long one that got cut mid-date */}
          <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{s.platform} · uygulama {s.appVersion}</Text>
          <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{when(s.startedAt)}’den beri</Text>
        </View>
        {!mine && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${s.device} oturumunu kapat`} disabled={busy} onPress={() => confirmEnd(s)} hitSlop={8}
            style={{ minHeight: 36, borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.separator, justifyContent: 'center' }}>
            <Text style={[type.footnote, { fontWeight: '600' }]}>Kapat</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Screen scroll>
      <TopBar />
      <Title>Oturumlar</Title>
      <Sub>Hesabına giriş yapılmış cihazlar. Tanımadığın bir oturumu kapat, sonra şifreni değiştir.</Sub>

      {list.error ? <FormError message={describeError(list.error)} /> : null}

      {sessions.filter((s) => s.sessionId === current).length > 0 && (
        <>
          <SectionHeader>Bu cihaz</SectionHeader>
          <Group>{sessions.filter((s) => s.sessionId === current).map(row)}</Group>
        </>
      )}
      <SectionHeader>{`Diğer oturumlar · ${others.length}`}</SectionHeader>
      <Group>
        {others.length === 0 && !list.loading && <Text style={[type.subhead, { color: colors.secondary, paddingVertical: 16 }]}>Başka bir cihazda açık oturum yok.</Text>}
        {others.map(row)}
      </Group>

      <FormError message={error} />
      {others.length > 0 && (
        <Pill title={busy ? 'Kapatılıyor…' : 'Diğer tüm oturumları kapat'} variant="secondary" disabled={busy} style={{ marginTop: 24, borderRadius: 14 }}
          onPress={() => Alert.alert('Diğer oturumlar', `${others.length} oturum kapatılsın mı? Bu cihazda açık kalırsın.`, [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Hepsini kapat', style: 'destructive', onPress: () => end(others.map((s) => s.sessionId)) },
          ])} />
      )}
      <Pill title="Bu cihazda çıkış yap" variant="secondary" style={{ marginTop: 10, borderRadius: 14 }}
        onPress={async () => { await signOut(); router.replace('/welcome'); }} />
    </Screen>
  );
}
