import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { realtime } from '@/api/realtime';
import type { ControlGrant, Device } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { Check, FormError, Group, Pill, Screen, SectionHeader, Sub, tap, TextButton, Title, TopBar } from '@/components/ui';
import { forgetDevice } from '@/lib/device';
import { personOf } from '@/lib/people';
import { useAsync } from '@/lib/useAsync';
import { useUserNames } from '@/lib/userNames';
import { colors, type } from '@/theme';

/**
 * V.2.2 Music Control Delegation. Control is per device: the owner hands one device to ONE friend at a
 * time (the API refuses a non-friend), and takes it back whenever they like. The friend can then steer
 * what plays on that device — skip to the next track — but not switch the speaker off.
 */
const iconFor = (d: Device): IconName => (/mac|laptop|book/i.test(d.model) ? 'laptop' : /speaker|home|tv/i.test(d.model) ? 'speaker' : 'phone');

export default function Handover() {
  const devices = useAsync(() => api.devices.list());
  const friends = useAsync(() => api.friends.list({ pageSize: 100 }));
  const grants = useAsync(() => api.me.controlGrants());
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = devices.data ?? [];
  const device = list.find((d) => d.deviceId === deviceId) ?? list[0] ?? null;
  const control = useAsync(() => (device ? api.devices.control(device.deviceId) : Promise.resolve(null)), [device?.deviceId]);
  const ownerNames = useUserNames((grants.data ?? []).map((g) => g.ownerId));
  const holder = control.data?.data.isDelegated ? control.data.data.controllerUserId : null;
  const holderName = useUserNames(holder ? [holder] : [])[holder ?? ''];

  // Control changes arrive on the per-account hub, so a grant made from another phone shows up here too.
  useEffect(() => {
    let sub: { close: () => void } | null = null;
    let closed = false;
    const refresh = () => { devices.reload(); control.reload(); grants.reload(); };
    realtime.control(refresh, refresh).then((s) => { if (closed) s.close(); else sub = s; }).catch(() => {});
    return () => { closed = true; sub?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) {
      setError(
        e instanceof ApiError && e.status === 412 ? 'Cihazın kontrolü az önce değişti. Yenilendi, tekrar dene.'
          : e instanceof ApiError && e.status === 422 ? 'Sadece arkadaşlarına devredebilirsin.'
            : describeError(e),
      );
    } finally {
      setBusy(false);
      control.reload(); devices.reload();
    }
  };

  const hand = () => run(async () => {
    if (!device || !pick || !control.data?.etag) return;
    await api.devices.grantControl(device.deviceId, pick, control.data.etag);
    setPick(null);
  });
  const takeBack = () => run(async () => { if (device) await api.devices.releaseControl(device.deviceId); });
  const removeDevice = () => {
    if (!device) return;
    Alert.alert('Cihazı kaldır', `${device.model} hesabından kaldırılsın mı? Devredilmişse kontrol de sona erer. Bu cihazda tekrar çalınca yeniden eklenir.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => run(async () => {
        await api.devices.remove(device.deviceId);
        forgetDevice(); // if it was this phone, the next "play here" registers it again
        setDeviceId(null);
      }) },
    ]);
  };

  /** The delegate's side: steer a device somebody handed over. */
  const skip = (g: ControlGrant) => run(async () => {
    const s = await api.devices.playbackSession(g.deviceId);
    await api.playback.advance(s.data.sessionId, s.data.nowPlayingId, s.etag ?? undefined);
  });

  return (
    <Screen scroll>
      <TopBar />
      <Title>Aux’u devret</Title>
      <Sub>Her cihazın kontrolünü tek bir arkadaşına verebilirsin.</Sub>

      {list.length === 0 && !devices.loading && (
        <Text style={[type.subhead, { color: colors.secondary, marginTop: 24 }]}>Kayıtlı cihaz yok. Bir partide “Bu cihazda çal”a basınca bu cihaz kaydedilir.</Text>
      )}

      <View style={{ marginTop: 22, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {list.map((d) => {
          const on = d.deviceId === device?.deviceId;
          const fg = on ? colors.white : colors.label;
          return (
            <Pressable key={d.deviceId} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { tap(); setDeviceId(d.deviceId); setPick(null); }}
              style={{ width: '31%', height: 96, borderRadius: 18, padding: 12, backgroundColor: on ? colors.label : colors.card, justifyContent: 'space-between' }}>
              <Icon name={iconFor(d)} color={fg} size={20} strokeWidth={1.6} />
              <View>
                <Text style={[type.subhead, { fontWeight: '600', color: fg }]} numberOfLines={1}>{d.model}</Text>
                <Text style={[type.caption, { color: fg, opacity: 0.7 }]} numberOfLines={1}>{d.controllerUserId ? 'Devredildi' : 'Sadece sen'}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {device && (
        <>
          <Text style={[type.footnote, { color: colors.secondary, marginTop: 24, marginBottom: 6, marginHorizontal: 16 }]}>
            {holder ? `${device.model.toUpperCase()} ŞU AN ${holderName.toUpperCase()} İLE PAYLAŞILIYOR` : `${device.model.toUpperCase()} KONTROLÜ KİMDE`}
          </Text>
          <Group>
            {(friends.data ?? []).length === 0 && !friends.loading && <Text style={[type.subhead, { color: colors.secondary, paddingVertical: 16 }]}>Henüz arkadaşın yok.</Text>}
            {(friends.data ?? []).map((f) => {
              const on = pick === f.userId || (!pick && holder === f.userId);
              return (
                <Pressable key={f.userId} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { tap(); setPick(f.userId); }} style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Avatar person={personOf(f.displayName, f.userId)} size={36} />
                  <Text style={[type.body, { flex: 1, fontWeight: '500' }]}>{f.displayName}</Text>
                  <Check on={on} round />
                </Pressable>
              );
            })}
          </Group>
          <Text style={[type.footnote, { color: colors.secondary, marginTop: 10, marginHorizontal: 16, lineHeight: 18 }]}>
            Devrettiğin kişi bu cihazda sıradakine geçebilir. Sesi kapatamaz; istediğin an geri alabilirsin.
          </Text>

          <FormError message={error} />
          {holder
            ? <Pill title="Kontrolü geri al" variant="secondary" disabled={busy} style={{ marginTop: 20 }} onPress={takeBack} />
            : null}
          <Pill title={busy ? 'Devrediliyor…' : pick ? 'Bu kişiye devret' : 'Bir arkadaş seç'} disabled={!pick || busy} style={{ marginTop: holder ? 8 : 20 }} onPress={hand} />
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <TextButton title="Bu cihazı hesabımdan kaldır" muted size={13} onPress={removeDevice} />
          </View>
        </>
      )}

      {(grants.data ?? []).length > 0 && (
        <>
          <SectionHeader>Sana devredilenler</SectionHeader>
          <Group>
            {grants.data!.map((g) => (
              <View key={g.deviceId} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '500' }]} numberOfLines={1}>{g.model}</Text>
                  <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{g.ownerDisplayName || ownerNames[g.ownerId]}’in cihazı</Text>
                </View>
                <Pill title="Sıradaki" height={36} style={{ paddingHorizontal: 16 }} disabled={busy} onPress={() => skip(g)} />
              </View>
            ))}
          </Group>
        </>
      )}
    </Screen>
  );
}
