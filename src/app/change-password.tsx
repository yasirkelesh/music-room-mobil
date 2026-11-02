import { useState } from 'react';
import { router } from 'expo-router';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { FieldHint, FieldRow, FormError, Group, Pill, Screen, Sub, TextButton, Title, TopBar } from '@/components/ui';

export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.auth.changePassword(current, next);
      router.back();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <TopBar />
      <Title>Şifreyi değiştir</Title>
      <Sub>Diğer cihazlardaki oturumların kapanır; bu cihazda açık kalırsın.</Sub>
      <Group style={{ marginTop: 28 }}>
        <FieldRow
          label="Mevcut" labelWidth={96} value={current} onChangeText={setCurrent} secureTextEntry={!show} textContentType="password"
          right={<TextButton title={show ? 'Gizle' : 'Göster'} muted onPress={() => setShow((v) => !v)} />}
        />
        <FieldRow label="Yeni" labelWidth={96} value={next} onChangeText={setNext} secureTextEntry={!show} textContentType="newPassword" />
      </Group>
      <FieldHint ok={next.length >= 12}>{next.length > 0 && next.length < 12 ? `${12 - next.length} karakter daha gerek (en az 12).` : 'En az 12 karakter, eskisinden farklı.'}</FieldHint>
      <FormError message={error} />
      <Pill title={busy ? 'Kaydediliyor…' : 'Şifreyi değiştir'} disabled={busy || !current || next.length < 12} style={{ marginTop: 24 }} onPress={submit} />
    </Screen>
  );
}
