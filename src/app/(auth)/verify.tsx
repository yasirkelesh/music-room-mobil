import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/Icon';
import { Pill, Screen, Sub, TextButton, Title, TopBar } from '@/components/ui';
import { colors, type } from '@/theme';

const LEN = 6;

export default function Verify() {
  const [code, setCode] = useState('482');
  const [left, setLeft] = useState(42);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <Screen>
      <TopBar />
      <View style={{ marginTop: 32, width: 72, height: 72, borderRadius: 36, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="mail" size={32} strokeWidth={1.6} />
      </View>
      <Title style={{ marginTop: 24 }}>E-postanı doğrula</Title>
      <Sub>
        <Text style={{ color: colors.label, fontWeight: '500' }}>yasir@ornek.com</Text> adresine 6 haneli bir kod gönderdik.
      </Sub>

      {/* One hidden input drives six boxes; iOS offers the code from Mail as an autofill suggestion. */}
      <Pressable accessibilityLabel="Doğrulama kodu" onPress={() => input.current?.focus()} style={{ marginTop: 32, flexDirection: 'row', gap: 8 }}>
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
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, LEN))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />

      <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[type.subhead, { color: colors.secondary }]}>Kod gelmedi mi?</Text>
        {left > 0
          ? <Text style={[type.subhead, type.numeric, { color: colors.secondary }]}>0:{String(left).padStart(2, '0')} sonra tekrar gönderebilirsin</Text>
          : <TextButton title="Tekrar gönder" weight="600" onPress={() => setLeft(60)} />}
      </View>

      {/* TODO: api.verifyEmail(code) */}
      <Pill title="Doğrula" disabled={code.length < LEN} style={{ marginTop: 'auto' }} onPress={() => router.replace('/taste')} />
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <TextButton title="E-postayı değiştir" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
