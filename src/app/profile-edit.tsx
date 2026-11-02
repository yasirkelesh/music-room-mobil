import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { FieldVisibility } from '@/api/types';
import { Choice, FieldRow, FormError, Group, Pill, Screen, SectionHeader, Title, TopBar } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, type } from '@/theme';

type Key = 'realName' | 'bio' | 'location' | 'birthDate';
const fields: { key: Key; label: string; placeholder?: string }[] = [
  { key: 'realName', label: 'Ad soyad' },
  { key: 'bio', label: 'Hakkında' },
  { key: 'location', label: 'Şehir' },
  { key: 'birthDate', label: 'Doğum tarihi', placeholder: 'YYYY-AA-GG' },
];
const options = [
  { value: String(FieldVisibility.Public), label: 'Herkes' },
  { value: String(FieldVisibility.Friends), label: 'Arkadaşlar' },
  { value: String(FieldVisibility.Private), label: 'Sadece ben' },
];

/** Every field carries its own visibility tier: the API refuses a value without one. */
export default function ProfileEdit() {
  const { me, reloadMe } = useAuth();
  const [values, setValues] = useState<Record<Key, string>>(() => ({
    realName: me?.realName.value ?? '', bio: me?.bio.value ?? '', location: me?.location.value ?? '', birthDate: me?.birthDate.value ?? '',
  }));
  const [tier, setTier] = useState<Record<Key, string>>(() => ({
    realName: String(me?.realName.visibility ?? FieldVisibility.Private), bio: String(me?.bio.visibility ?? FieldVisibility.Private),
    location: String(me?.location.visibility ?? FieldVisibility.Private), birthDate: String(me?.birthDate.visibility ?? FieldVisibility.Private),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = Object.fromEntries(fields.map(({ key }) => [
        key, { value: values[key].trim() || null, visibility: Number(tier[key]) },
      ]));
      await api.me.updateProfile(body);
      await reloadMe();
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
      <Title>Profili düzenle</Title>
      <Text style={[type.subhead, { color: colors.secondary, marginTop: 6 }]}>Kullanıcı adın herkese açıktır. Diğer alanları kimin görebileceğini sen seç.</Text>

      {fields.map((f) => (
        <View key={f.key}>
          <SectionHeader>{f.label}</SectionHeader>
          <Group>
            <FieldRow label={f.label} labelWidth={0} value={values[f.key]} placeholder={f.placeholder} autoCapitalize={f.key === 'birthDate' ? 'none' : 'sentences'}
              onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))} />
          </Group>
          <View style={{ marginTop: 6, marginHorizontal: 16 }}>
            <Choice options={options} value={tier[f.key]} onChange={(t) => setTier((s) => ({ ...s, [f.key]: t }))} />
          </View>
        </View>
      ))}

      <FormError message={error} />
      <Pill title={busy ? 'Kaydediliyor…' : 'Kaydet'} disabled={busy} style={{ marginTop: 28 }} onPress={save} />
    </Screen>
  );
}
