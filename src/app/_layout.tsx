import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActionSheetHost } from '@/components/ActionSheet';
import { AppStack } from '@/components/AppStack';
import { ServerBanner } from '@/components/ServerBanner';
import { forwardConsole } from '@/lib/devlog';
import { AuthProvider } from '@/state/auth';
import { PlayerProvider } from '@/state/player';
import { colors } from '@/theme';

forwardConsole();

/**
 * Dark-surfaced screens get light status-bar icons, every other screen dark ones. Decided here from the
 * route instead of per screen: a stacked screen's <StatusBar> stays mounted underneath and would win.
 */
const DARK = [/^\/welcome$/, /^\/party\/(?!rules|pick)[^/]+$/];

export default function RootLayout() {
  const path = usePathname();
  const barStyle = DARK.some((r) => r.test(path)) ? 'light' : 'dark';
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
        <PlayerProvider>
          <StatusBar style={barStyle} />
          <AppStack
            bg={colors.bg}
            routes={[
              { name: 'index' },
              { name: '(auth)' },
              { name: '(tabs)', fade: true },
              { name: 'now-playing', modal: true },
              { name: 'list/new', modal: true },
              { name: 'list/add', modal: true, bg: '#111' },
              { name: 'list/settings', modal: true, bg: '#111' },
            ]}
          />
          <ServerBanner />
          <ActionSheetHost />
        </PlayerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
