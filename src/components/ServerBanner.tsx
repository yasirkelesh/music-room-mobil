import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { colors, type } from '@/theme';

const EVERY = 15_000;

/**
 * A thin band at the top while the API's liveness probe (`GET /health`) fails, so "nothing loads" has an
 * explanation. Polls only while the app is in the foreground.
 */
export function ServerBanner() {
  const insets = useSafeAreaInsets();
  const [down, setDown] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let live = true;
    const check = async () => {
      try { await api.health(); if (live) setDown(false); } catch { if (live) setDown(true); }
      if (live && AppState.currentState === 'active') timer = setTimeout(check, EVERY);
    };
    timer = setTimeout(check, 1000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { if (timer) clearTimeout(timer); timer = setTimeout(check, 0); }
    });
    return () => { live = false; if (timer) clearTimeout(timer); sub.remove(); };
  }, []);

  if (!down) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 4, left: 16, right: 16, alignItems: 'center' }}>
      <View accessibilityRole="alert" style={{ borderRadius: 16, backgroundColor: colors.label, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF453A' }} />
        <Text style={[type.footnote, { color: colors.white, fontWeight: '600' }]}>Sunucuya ulaşılamıyor · yeniden deneniyor</Text>
      </View>
    </Animated.View>
  );
}
