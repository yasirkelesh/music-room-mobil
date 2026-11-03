import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { DEFAULT_BASE_URL, getBaseUrl } from '@/api/client';
import { Icon } from '@/components/Icon';
import { BackButton, FieldHint, FieldRow, FormError, Group, Pill, Screen, Sub, TextButton, Title, TopBar } from '@/components/ui';
import { displayAddress, normalizeAddress, probeServer, saveServerAddress } from '@/lib/serverAddress';
import { useAuth } from '@/state/auth';
import { colors, type } from '@/theme';

type Check = { state: 'idle' } | { state: 'busy' } | { state: 'ok'; url: string } | { state: 'fail'; url: string; reason: string };

/**
 * Which back-end the app talks to (subject V.5). Testing first, so a typo does not strand the app on an
 * address that answers nothing; saving an unreachable one is still allowed, on a second press.
 */
export default function Server() {
  const { status, signOut } = useAuth();
  const current = getBaseUrl();
  const [text, setText] = useState(displayAddress(current));
  const [check, setCheck] = useState<Check>({ state: 'idle' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = normalizeAddress(text);
  const changed = !!url && url !== current;
  const checkedThis = (check.state === 'ok' || check.state === 'fail') && check.url === url;

  const test = async () => {
    if (!url) { setError('Geçerli bir adres yaz: örneğin 192.168.1.20:8085 ya da https://api.ornek.com'); return; }
    setError(null);
    setCheck({ state: 'busy' });
    const r = await probeServer(url);
    Haptics.notificationAsync(r.ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    setCheck(r.ok ? { state: 'ok', url } : { state: 'fail', url, reason: r.reason });
    return r.ok;
  };

  const apply = async (target: string | null) => {
    setBusy(true);
    try {
      // a session belongs to the server that issued it: end it there (if it answers), then forget it here
      if (status === 'signedIn') await signOut().catch(() => signOut({ localOnly: true }));
      await saveServerAddress(target);
      if (status === 'signedIn') router.replace('/welcome');
      else router.back();
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!url) { setError('Geçerli bir adres yaz: örneğin 192.168.1.20:8085 ya da https://api.ornek.com'); return; }
    // first press tests; a failed test turns the button into "save anyway"
    if (!checkedThis) { const ok = await test(); if (!ok) return; }
    await apply(url);
  };

  const saveTitle = busy ? 'Kaydediliyor…'
    : check.state === 'busy' ? 'Deneniyor…'
      : checkedThis && check.state === 'fail' ? 'Yine de kaydet'
        : 'Kaydet ve bağlan';

  return (
    <Screen scroll>
      <TopBar left={<BackButton icon="close" label="Kapat" />} />
      <Title>Sunucu adresi</Title>
      <Sub>Uygulamanın bağlandığı back-end. Test için kendi sunucunun adresini yazabilirsin.</Sub>

      <Group style={{ marginTop: 24 }}>
        <FieldRow label="Adres" labelWidth={0} value={text}
          onChangeText={(t) => { setText(t); setCheck({ state: 'idle' }); setError(null); }}
          placeholder="192.168.1.20:8085" autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="go"
          onSubmitEditing={test} />
      </Group>
      <FieldHint>Şema yazmazsan http:// eklenir. Telefonda “localhost” bilgisayarın değil, telefonun kendisidir; bilgisayarının ağdaki IP adresini kullan.</FieldHint>

      {check.state === 'ok' && check.url === url && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginHorizontal: 16 }}>
          <Icon name="check" size={16} strokeWidth={2.2} />
          <Text style={[type.subhead, { fontWeight: '500' }]}>Sunucu yanıt veriyor.</Text>
        </View>
      )}
      {check.state === 'fail' && check.url === url && <FormError message={`${check.reason} Adresi ve sunucunun açık olduğunu kontrol et.`} style={{ marginHorizontal: 16 }} />}
      <FormError message={error} style={{ marginHorizontal: 16 }} />

      <View style={{ marginTop: 28, gap: 10 }}>
        <Pill title={saveTitle} disabled={!changed || busy || check.state === 'busy'} onPress={save} />
        <Pill title={check.state === 'busy' ? 'Deneniyor…' : 'Bağlantıyı test et'} variant="secondary" disabled={!url || check.state === 'busy'} onPress={test} />
      </View>

      {status === 'signedIn' && changed && (
        <Text style={[type.footnote, { color: colors.secondary, marginTop: 14, textAlign: 'center', lineHeight: 18 }]}>
          Sunucu değişince bu hesaptan çıkış yapılır; yeni sunucuda tekrar giriş yapman gerekir.
        </Text>
      )}

      <View style={{ marginTop: 'auto', paddingTop: 32, alignItems: 'center', gap: 2 }}>
        <Text style={[type.footnote, { color: colors.secondary }]}>Şu an: {displayAddress(current)}</Text>
        {current !== DEFAULT_BASE_URL
          ? <TextButton title={`Varsayılana dön (${displayAddress(DEFAULT_BASE_URL)})`} muted onPress={() => apply(null)} />
          : <Text style={[type.footnote, { color: colors.tertiary }]}>Bu build’in varsayılan sunucusu</Text>}
      </View>
    </Screen>
  );
}
