import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { LicenceMode, Visibility } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { dark, Kicker, Segments } from '@/components/Party';
import { personOf } from '@/lib/people';
import { useAsync } from '@/lib/useAsync';
import { colors, field, type } from '@/theme';
import { useKeyboardHeight } from '@/lib/keyboard';
import { readable } from '@/lib/layout';

type Vis = 'public' | 'private';
type Lic = 'everyone' | 'invited';

/** Owner-only: name, who can find it, who can edit it, and who is named on it. */
export default function ListSettings() {
  const kb = useKeyboardHeight();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pl = useAsync(() => api.playlists.get(id), [id]);
  const collaborators = useAsync(() => api.playlists.collaborators(id), [id]);
  const friends = useAsync(() => api.friends.list({ pageSize: 100 }));
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const p = pl.data?.data;
  const vis: Vis = p?.visibility === Visibility.Private ? 'private' : 'public';
  const lic: Lic = p?.licence === LicenceMode.InvitedOnly ? 'invited' : 'everyone';
  const named = new Set((collaborators.data ?? []).map((c) => c.userId));

  useEffect(() => { if (p && name === null) setTimeout(() => setName(p.name), 0); }, [p, name]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); Haptics.selectionAsync().catch(() => {}); } catch (e) {
      setError(e instanceof ApiError && e.status === 412 ? 'Liste az önce değişti. Yenilendi, tekrar dene.' : describeError(e));
    } finally {
      setBusy(false);
      pl.reload(); collaborators.reload();
    }
  };

  const setRules = (v: Vis, l: Lic) => run(() => api.playlists.setLicence(id, {
    visibility: v === 'public' ? Visibility.Public : Visibility.Private,
    licence: l === 'everyone' ? LicenceMode.Everyone : LicenceMode.InvitedOnly,
  }));

  const rename = () => {
    const n = (name ?? '').trim();
    if (!p || !n || n === p.name) return;
    run(async () => {
      const fresh = await api.playlists.get(id);
      await api.playlists.rename(id, n, fresh.etag ?? '');
    });
  };

  const del = () => Alert.alert('Listeyi sil', `“${p?.name}” silinsin mi? Bu geri alınamaz.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: () => run(async () => { await api.playlists.remove(id); router.dismissAll(); router.replace('/lists'); }) },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', paddingTop: 8 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: dark.faint }} /></View>
        <View style={{ height: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[type.title2, { color: colors.white }]}>Liste ayarları</Text>
          <Pressable accessibilityRole="button" onPress={() => { rename(); router.back(); }} hitSlop={8} style={{ height: 44, justifyContent: 'center' }}>
            <Text style={[type.headline, { color: colors.white }]}>Bitti</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ ...readable, paddingHorizontal: 20, paddingBottom: 40 + kb }} keyboardShouldPersistTaps="handled">
          <Kicker>Ad</Kicker>
          <TextInput value={name ?? ''} onChangeText={setName} onEndEditing={rename} returnKeyType="done" accessibilityLabel="Liste adı"
            placeholder="Liste adı" placeholderTextColor={dark.faint} selectionColor={colors.white}
            style={[field, type.title2, { color: colors.white, minHeight: 52, borderRadius: 14, backgroundColor: dark.card, paddingHorizontal: 14 }]} />

          <Kicker>Kimler görebilir</Kicker>
          <Segments value={vis} onChange={(v) => setRules(v, lic)} options={[{ value: 'public', label: 'Herkes' }, { value: 'private', label: 'Sadece davetliler' }]} />
          <Kicker>Kimler düzenleyebilir</Kicker>
          <Segments value={lic} onChange={(l) => setRules(vis, l)} options={[{ value: 'everyone', label: 'Herkes' }, { value: 'invited', label: 'Sadece davetliler' }]} />
          <Text style={[type.footnote, { color: dark.sub, marginTop: 10, lineHeight: 18 }]}>
            {vis === 'public' ? 'Liste keşfette görünür.' : 'Liste sadece aşağıdaki kişilere görünür.'} {lic === 'everyone' ? 'Görebilen herkes plak ekleyip sırayı değiştirebilir.' : 'Plakları sadece düzenleyiciler değiştirebilir.'}
          </Text>

          <Kicker>Düzenleyiciler</Kicker>
          {(collaborators.data ?? []).length === 0 && <Text style={[type.subhead, { color: dark.sub }]}>Henüz kimse eklenmedi.</Text>}
          {(collaborators.data ?? []).map((c) => (
            <View key={c.userId} style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar person={personOf(c.displayName, c.userId)} size={36} override={{ bg: colors.graphite, fg: colors.white }} />
              <View style={{ flex: 1 }}>
                <Text style={[type.callout, { color: colors.white, fontWeight: '500' }]}>{c.displayName}</Text>
                <Text style={[type.footnote, { color: dark.sub }]}>{c.canEdit ? 'Düzenleyebilir' : 'Sadece görür'}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${c.displayName} çıkar`} disabled={busy} hitSlop={8}
                onPress={() => run(() => api.playlists.removeCollaborator(id, c.userId))} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={dark.sub} />
              </Pressable>
            </View>
          ))}

          {(friends.data ?? []).filter((f) => !named.has(f.userId)).length > 0 && (
            <>
              <Text style={[type.footnote, { color: dark.sub, marginTop: 16, marginBottom: 4 }]}>Arkadaşlarından ekle</Text>
              {(friends.data ?? []).filter((f) => !named.has(f.userId)).map((f) => (
                <View key={f.userId} style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar person={personOf(f.displayName, f.userId)} size={36} override={{ bg: dark.cardStrong, fg: colors.white }} />
                  <Text style={[type.callout, { color: colors.white, flex: 1 }]}>{f.displayName}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${f.displayName} düzenleyici olarak ekle`} disabled={busy}
                    onPress={() => run(() => api.playlists.addCollaborator(id, f.userId, true))}
                    style={({ pressed }) => ({ height: 32, borderRadius: 16, paddingHorizontal: 14, backgroundColor: colors.white, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                    <Text style={[type.footnote, { color: colors.black, fontWeight: '700' }]}>Ekle</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}

          {error && <Text accessibilityRole="alert" style={[type.subhead, { color: '#FF8A7A', marginTop: 16 }]}>{error}</Text>}

          <Pressable accessibilityRole="button" onPress={del} disabled={busy}
            style={({ pressed }) => ({ marginTop: 36, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,69,58,0.15)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Text style={[type.headline, { color: '#FF6961' }]}>Listeyi sil</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
