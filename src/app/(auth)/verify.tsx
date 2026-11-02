import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, TextInputInstance, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/api/client';
import { extractToken, describeError, isStatus } from '@/api/errors';
import { Icon } from '@/components/Icon';
import { FieldRow, FormError, Group, Pill, Screen, Sub, TextButton, Title, TopBar } from '@/components/ui';
import { colors, type } from '@/theme';

const LEN = 6;
const COOLDOWN = 60;
/** The mail's code: six letters or digits; case and spacing don't matter to the API. */
const cleanCode = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LEN);

/**
 * Verify the address: type the six-character code from the mail (with the address it went to), or —
 * when the app is opened by the mail's link (musicroom://verify?token=…) or the link is pasted — the
 * link's token. A wrong code costs one of five attempts on that mail.
 */
export default function Verify() {
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [linkMode, setLinkMode] = useState(false);
  const [link, setLink] = useState('');
  const [left, setLeft] = useState(params.token ? 0 : COOLDOWN);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const autoTried = useRef(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verify = async (cred: { token: string } | { email: string; code: string }) => {
    setBusy(true);
    setError(null);
    try {
      await api.auth.verifyEmail(cred);
      router.replace({ pathname: '/login', params: { email, verified: '1' } });
    } catch (e) {
      setError(
        isStatus(e, 400) ? ('code' in cred
          ? 'Kod tutmadı. Adresi ve kodu kontrol et; 5 yanlış denemeden sonra kod geçersiz olur, o zaman yeni mail iste.'
          : 'Link tanınmadı ya da daha önce kullanılmış. En son gelen maildekini dene.')
          : isStatus(e, 410) ? 'Kodun süresi dolmuş. Aşağıdan yeni bir mail iste.'
            : describeError(e),
      );
      if ('code' in cred) setCode('');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (linkMode) { const t = extractToken(link); if (t) verify({ token: t }); return; }
    if (code.length === LEN && email.includes('@')) verify({ email: email.trim(), code });
  };

  // Opened by the mail's link: its token is spent once, so submit it once.
  useEffect(() => {
    if (params.token && !autoTried.current) { autoTried.current = true; verify({ token: params.token }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  // The sixth character submits on its own.
  const onCode = (t: string) => {
    const c = cleanCode(t);
    setCode(c);
    if (c.length === LEN && email.includes('@') && !busy) verify({ email: email.trim(), code: c });
  };

  const resend = async () => {
    setError(null);
    try {
      await api.auth.resendVerification(email.trim());
      setResent(true);
      setLeft(COOLDOWN);
      setCode('');
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <Screen scroll>
      <TopBar />
      <View style={{ marginTop: 32, width: 72, height: 72, borderRadius: 36, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="mail" size={32} strokeWidth={1.6} />
      </View>
      <Title style={{ marginTop: 24 }}>E-postanı doğrula</Title>
      <Sub>
        {params.email
          ? <><Text style={{ color: colors.label, fontWeight: '500' }}>{params.email}</Text> adresine 6 karakterli bir kod gönderdik.</>
          : 'Kayıt olduğun adresi ve maildeki 6 karakterli kodu gir.'}
      </Sub>

      {!params.email && (
        <Group style={{ marginTop: 20 }}>
          <FieldRow label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
        </Group>
      )}

      {linkMode ? (
        <Group style={{ marginTop: 24 }}>
          <FieldRow label="Link" value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} placeholder="Maildeki linki yapıştır" onSubmitEditing={submit} />
        </Group>
      ) : (
        <>
          {/* One hidden input drives six boxes; iOS offers the code from Mail as an autofill suggestion. */}
          <Pressable accessibilityLabel="Doğrulama kodu" onPress={() => input.current?.focus()} style={{ marginTop: 28, flexDirection: 'row', gap: 8 }}>
            {Array.from({ length: LEN }).map((_, i) => {
              const active = i === code.length;
              return (
                <View key={i} style={{ flex: 1, height: 60, borderRadius: 12, backgroundColor: colors.card, borderWidth: active ? 2 : 0, borderColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[type.numeric, { fontSize: 28, fontWeight: '600' }]}>{code[i] ?? ''}</Text>
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={input}
            value={code}
            onChangeText={onCode}
            autoCapitalize="characters"
            autoCorrect={false}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus={!!params.email}
            maxLength={12}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
          />
        </>
      )}

      <FormError message={error} />
      {resent && <Text style={[type.subhead, { color: colors.secondary, marginTop: 12 }]}>Yeni bir kod gönderdik (adres kayıtlıysa). En son gelen maildekini kullan.</Text>}

      <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[type.subhead, { color: colors.secondary }]}>Kod gelmedi mi?</Text>
        {left > 0
          ? <Text style={[type.subhead, type.numeric, { color: colors.secondary }]}>0:{String(left).padStart(2, '0')} sonra tekrar gönderebilirsin</Text>
          : <TextButton title="Tekrar gönder" weight="600" onPress={resend} />}
      </View>
      <TextButton title={linkMode ? 'Kodla doğrula' : 'Mailde link mi var? Linki yapıştır'} muted onPress={() => { setLinkMode((m) => !m); setError(null); }} />

      <Pill
        title={busy ? 'Doğrulanıyor…' : 'Doğrula'}
        disabled={busy || (linkMode ? !link.trim() : code.length < LEN || !email.includes('@'))}
        style={{ marginTop: 'auto' }}
        onPress={submit}
      />
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <TextButton title="Giriş yap" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}
