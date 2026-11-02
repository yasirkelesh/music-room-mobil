import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/state/auth';
import { colors, type } from '@/theme';

export default function Index() {
  const { status } = useAuth();
  if (status === 'loading') return <Launching />;
  return <Redirect href={status === 'signedIn' ? '/(tabs)' : '/welcome'} />;
}

/** Restoring the session can take a while when the server is asleep: say so instead of a blank screen. */
function Launching() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <Text style={[type.title2, { fontWeight: '700' }]}>music room</Text>
      <ActivityIndicator color={colors.label} />
      <Text accessibilityLiveRegion="polite" style={[type.footnote, { color: colors.secondary, textAlign: 'center', lineHeight: 18, minHeight: 36 }]}>
        {slow ? 'Sunucu uyanıyor, bu ilk açılışta bir dakika kadar sürebilir.' : 'Oturumun açılıyor…'}
      </Text>
    </View>
  );
}
