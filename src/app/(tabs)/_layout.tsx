import { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, BottomTabBarProps } from 'expo-router/js-tabs';
import { BlurView } from 'expo-blur';
import { Icon, IconName } from '@/components/Icon';
import { MiniPlayer } from '@/components/MiniPlayer';
import { tap } from '@/components/ui';
import { colors } from '@/theme';
import { readable } from '@/lib/layout';

const tabs: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Dinle', icon: 'listen' },
  jam: { label: 'Jam', icon: 'jam' },
  lists: { label: 'Listeler', icon: 'lists' },
  search: { label: 'Ara', icon: 'search' },
};

function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <MiniPlayer />
      {/* Android's blur is see-through without a native blur target: content showed behind the labels. Solid there. */}
      <BarSurface>
        <View style={{ ...readable, flexDirection: 'row', paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }}>
          {state.routes.map((route, i) => {
            const meta = tabs[route.name];
            if (!meta) return null;
            const focused = state.index === i;
            const c = focused ? colors.label : colors.tertiary;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={meta.label}
                onPress={() => {
                  tap();
                  const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) navigateToTab(route.key);
                }}
                style={{ flex: 1, alignItems: 'center', gap: 3, minHeight: 44 }}
              >
                <Icon name={meta.icon} color={c} size={24} />
                <Text style={{ fontSize: 10, fontWeight: '500', color: c }}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BarSurface>
    </View>
  );
}

const edge = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator };

function BarSurface({ children }: { children: ReactNode }) {
  if (Platform.OS === 'ios') return <BlurView intensity={80} tint="systemChromeMaterialLight" style={edge}>{children}</BlurView>;
  return <View style={[edge, { backgroundColor: colors.bg }]}>{children}</View>;
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="jam" />
      <Tabs.Screen name="lists" />
      <Tabs.Screen name="search" />
    </Tabs>
  );
}

