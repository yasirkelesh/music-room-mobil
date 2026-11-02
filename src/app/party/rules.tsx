import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { LicenceMode, PresenceProof, Visibility } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Check, Choice, FieldHint, FormError, Group, Pill, Radio, Screen, SectionHeader, tap, TextButton } from '@/components/ui';
import { personOf } from '@/lib/people';
import { useAsync } from '@/lib/useAsync';
import { colors, field, type } from '@/theme';

/**
 * V.2.1 visibility + licence for an event:
 *  - visibility: public (default) or private (only invited can find it)
 *  - licence: everyone (default), invited only, or people at a place during set hours
 */
type Vis = 'public' | 'private';
type Lic = 'everyone' | 'invited' | 'place';
const hh = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`;

function Option({ title, sub, on, onPress }: { title: string; sub: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); onPress(); }} style={{ height: 60, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ flex: 1 }}>
        <Text style={[type.callout, { fontWeight: '500' }]}>{title}</Text>
        <Text style={[type.footnote, { color: colors.secondary }]}>{sub}</Text>
      </View>
      <Radio on={on} />
    </Pressable>
  );
}

function Stepper({ value, onDown, onUp, what, label }: { value: number; onDown: () => void; onUp: () => void; what: string; label: string }) {
  const btn = { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Text style={[type.footnote, { color: colors.secondary }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${what} bir saat öne al`} onPress={() => { tap(); onDown(); }} style={btn}><Text style={{ fontSize: 20 }}>−</Text></Pressable>
        <Text style={[type.numeric, { fontSize: 24, fontWeight: '600', minWidth: 64, textAlign: 'center' }]}>{hh(value)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${what} bir saat ileri al`} onPress={() => { tap(); onUp(); }} style={btn}><Text style={{ fontSize: 20 }}>+</Text></Pressable>
      </View>
    </View>
  );
}

type Proof = 'geofence' | 'code' | 'both';

/** Create a party, or (with `?id=`) edit one you own: name and hours, who finds it, who votes, guests. */
export default function Rules() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const nowHour = new Date().getHours();
  const [base, setBase] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [name, setName] = useState('');
  const [vis, setVis] = useState<Vis>('public');
  const [lic, setLic] = useState<Lic>('everyone');
  const [proof, setProof] = useState<Proof>('geofence');
  const [from, setFrom] = useState(nowHour);
  const [to, setTo] = useState(nowHour + 2);
  const [radius, setRadius] = useState('200');
  const [place, setPlace] = useState<{ latitude: number; longitude: number } | null>(null);
  const [invited, setInvited] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const friends = useAsync(() => api.friends.list({ pageSize: 100 }));
  const existing = useAsync(() => (id ? api.events.get(id) : Promise.resolve(null)), [id]);
  const guests = useAsync(() => (id ? api.events.invitations(id) : Promise.resolve([])), [id]);

  // Editing: fill the form once from the event (hours are counted from the start day's midnight).
  useEffect(() => {
    const ev = existing.data?.data;
    if (!ev || !guests.data || prefilled) return;
    const t = setTimeout(() => {
      const start = new Date(ev.startsAtUtc);
      const day = new Date(start); day.setHours(0, 0, 0, 0);
      setBase(day.getTime());
      setFrom(Math.round((start.getTime() - day.getTime()) / 3600e3));
      setTo(Math.round((new Date(ev.endsAtUtc).getTime() - day.getTime()) / 3600e3));
      setName(ev.name);
      setVis(ev.visibility === Visibility.Public ? 'public' : 'private');
      setLic(ev.licence === LicenceMode.Everyone ? 'everyone' : ev.licence === LicenceMode.InvitedOnly ? 'invited' : 'place');
      // The API does not echo the proof; a venue on record means location (or both), none means code.
      if (ev.geofence) {
        setPlace({ latitude: ev.geofence.latitude, longitude: ev.geofence.longitude });
        setRadius(String(ev.geofence.radiusMetres));
        setProof('geofence');
      } else {
        setProof('code');
      }
      setInvited(guests.data!.map((g) => g.userId));
      setPrefilled(true);
    }, 0);
    return () => clearTimeout(t);
  }, [existing.data, guests.data, prefilled]);

  const needsInvites = vis === 'private' || lic === 'invited';
  const needsPlace = lic === 'place' && proof !== 'code';
  const seen = vis === 'public' ? 'Herkes bu partiyi bulabilir' : 'Bu partiyi sadece davetliler bulabilir';
  const who = lic === 'everyone' ? 'bulabilen herkes' : lic === 'invited' ? 'davetliler'
    : `${hh(from)}–${hh(to)} arası ${proof === 'code' ? 'mekân kodunu girenler' : proof === 'both' ? 'yerinde olup kodu girenler' : 'seçtiğin yerin çevresindekiler'}`;
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const dayText = base === today ? 'bugün' : new Date(base).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  const useMyLocation = async () => {
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setError('Konum izni verilmedi. Ayarlardan izin ver.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPlace({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      setError('Konum alınamadı.');
    }
  };

  const at = (h: number) => new Date(base + h * 3600e3).toISOString();
  const valid = name.trim().length > 0 && (!needsPlace || !!place) && (!editing || prefilled);

  const rules = () => ({
    visibility: vis === 'public' ? Visibility.Public : Visibility.Private,
    licence: lic === 'everyone' ? LicenceMode.Everyone : lic === 'invited' ? LicenceMode.InvitedOnly : LicenceMode.LocationAndTimeRestricted,
    ...(lic === 'place' ? {
      presenceProof: proof === 'geofence' ? PresenceProof.Geofence : proof === 'code' ? PresenceProof.EventCode : PresenceProof.Both,
      geofence: proof !== 'code' && place ? { ...place, radiusMetres: Number(radius) } : null,
    } : {}),
  });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!editing) {
        const { eventId } = await api.events.create({ name: name.trim(), startsAtUtc: at(from), endsAtUtc: at(to), ...rules() });
        if (needsInvites) await Promise.all(invited.map((uid) => api.events.invite(eventId, uid).catch(() => {})));
        router.replace({ pathname: '/party/[id]', params: { id: eventId } });
        return;
      }
      // Name and hours are guarded by the event's ETag; rules and guests are not.
      const fresh = await api.events.get(id);
      const ev = fresh.data;
      if (ev.name !== name.trim() || +new Date(ev.startsAtUtc) !== +new Date(at(from)) || +new Date(ev.endsAtUtc) !== +new Date(at(to))) {
        await api.events.update(id, { name: name.trim(), startsAtUtc: at(from), endsAtUtc: at(to) }, fresh.etag ?? '');
      }
      const r = rules();
      await api.events.setLicence(id, { visibility: r.visibility, licence: r.licence, presenceProof: r.presenceProof ?? null, geofence: r.geofence ?? null });
      if (needsInvites) {
        const before = new Set((guests.data ?? []).map((g) => g.userId));
        const after = new Set(invited);
        await Promise.all([
          ...invited.filter((u) => !before.has(u)).map((u) => api.events.invite(id, u).catch(() => {})),
          ...[...before].filter((u) => !after.has(u)).map((u) => api.events.uninvite(id, u).catch(() => {})),
        ]);
      }
      router.back();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 412 ? 'Parti az önce başka bir yerden değişti. Yenile ve tekrar dene.' : describeError(e));
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextButton title="Vazgeç" onPress={() => router.back()} />
        <Text style={[type.subhead, { fontWeight: '600' }]}>{editing ? 'PARTİYİ DÜZENLE' : 'YENİ PARTİ'}</Text>
      </View>

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 8 }]}>Ad</Text>
      <TextInput accessibilityLabel="Parti adı" value={name} onChangeText={setName} placeholder="Parti adı" placeholderTextColor={colors.tertiary} maxFontSizeMultiplier={1.3} style={[field, { fontSize: 32, fontWeight: '700', color: colors.label, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.label, marginTop: 4 }]} />

      <SectionHeader>Kimler bulabilir</SectionHeader>
      <Group>
        <Option title="Herkese açık" sub="Herkes bulabilir" on={vis === 'public'} onPress={() => setVis('public')} />
        <Option title="Özel" sub="Sadece davet ettiklerin görür" on={vis === 'private'} onPress={() => setVis('private')} />
      </Group>

      <SectionHeader>Kimler oy verebilir</SectionHeader>
      <Group>
        <Option title="Herkes" sub="Bulabilen herkes" on={lic === 'everyone'} onPress={() => setLic('everyone')} />
        <Option title="Sadece davetliler" sub="Davetliler oylar, diğerleri dinler" on={lic === 'invited'} onPress={() => setLic('invited')} />
        <Option title="Burada, belirli saatlerde" sub="Sadece o saatte o yerde olanlar" on={lic === 'place'} onPress={() => setLic('place')} />
      </Group>

      <SectionHeader>{`Saat aralığı (${dayText})`}</SectionHeader>
      {/* stacked with their own labels: side by side the ± targets were cramped on narrow screens */}
      <View style={{ borderRadius: 20, backgroundColor: colors.card, padding: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', rowGap: 16 }}>
        <Stepper label="Başlangıç" what="Başlangıcı" value={from} onDown={() => setFrom((f) => Math.max(0, f - 1))} onUp={() => setFrom((f) => (f + 1 < to ? f + 1 : f))} />
        <Stepper label="Bitiş" what="Bitişi" value={to} onDown={() => setTo((t) => (t - 1 > from ? t - 1 : t))} onUp={() => setTo((t) => Math.min(48, t + 1))} />
      </View>

      {lic === 'place' && (
        <View style={{ marginTop: 14, borderRadius: 20, backgroundColor: colors.card, padding: 16, gap: 12 }}>
          <Text style={[type.footnote, { color: colors.secondary }]}>Orada olduklarını nasıl kanıtlasınlar?</Text>
          <Choice value={proof} onChange={setProof} options={[{ value: 'geofence', label: 'Konum' }, { value: 'code', label: 'Mekân kodu' }, { value: 'both', label: 'İkisi' }]} />
          {proof !== 'code' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="pin" size={16} />
                <Text style={[type.subhead, { flex: 1 }]}>{place ? `Seçilen yer, ${radius} m çevresi` : 'Yer seçilmedi'}</Text>
                <TextButton title={place ? 'Konumumla güncelle' : 'Konumumu kullan'} size={13} onPress={useMyLocation} />
              </View>
              <Choice value={radius} onChange={setRadius} options={[...new Set(['100', '200', '500', radius])].map((r) => ({ value: r, label: `${r} m` }))} />
            </>
          )}
          {proof !== 'geofence' && (
            <Text style={[type.footnote, { color: colors.secondary, lineHeight: 18 }]}>Partideyken ⋯ menüsünden “Mekân kodu üret”e bas ve kodu misafirlere göster. Her kod 15 dakika geçerli; her kişi her oyda yeni bir kod girer.</Text>
          )}
        </View>
      )}

      {needsInvites && (
        <>
          <SectionHeader>{`Davet et · ${invited.length}`}</SectionHeader>
          <Group>
            {(friends.data ?? []).length === 0 && <Text style={[type.subhead, { color: colors.secondary, paddingVertical: 16 }]}>Henüz arkadaşın yok. Davetsiz de oluşturabilirsin.</Text>}
            {(friends.data ?? []).map((f) => {
              const on = invited.includes(f.userId);
              return (
                <Pressable key={f.userId} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => { tap(); setInvited((l) => (on ? l.filter((x) => x !== f.userId) : [...l, f.userId])); }} style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Avatar person={personOf(f.displayName, f.userId)} size={36} />
                  <Text style={[type.body, { flex: 1, fontWeight: '500' }]}>{f.displayName}</Text>
                  <Check on={on} round />
                </Pressable>
              );
            })}
          </Group>
        </>
      )}

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 24, lineHeight: 18 }]}>{seen}. Oy verebilenler: {who}.</Text>
      <FormError message={error} />
      <Pill title={busy ? (editing ? 'Kaydediliyor…' : 'Oluşturuluyor…') : editing ? 'Kaydet' : 'Partiyi başlat'} disabled={!valid || busy} style={{ marginTop: 12 }} left={editing ? undefined : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} />} onPress={save} />
      {!valid && !busy && <FieldHint>{!name.trim() ? 'Başlatmak için partiye bir ad ver.' : needsPlace && !place ? 'Mekân konumunu seç.' : 'Parti yükleniyor…'}</FieldHint>}
    </Screen>
  );
}
