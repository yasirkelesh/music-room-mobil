// One stack definition, two engines. iOS keeps the native stack: swipe-back from the edge and
// pull-down-to-close sheets come with it. Android's native stack has neither, so there the JS stack
// runs with the iOS transitions and gestures, and the two platforms feel the same.

import { Platform } from 'react-native';
import { Stack as NativeStack } from 'expo-router';
import { CardStyleInterpolators, Stack as JSStack, StackNavigationOptions, TransitionPresets } from 'expo-router/js-stack';

export type StackRoute = {
  name: string;
  /** Slides up as a sheet; pull it down to close. */
  modal?: boolean;
  /** Screen background when it differs from the stack's. */
  bg?: string;
  /** Cross-fade instead of a slide (e.g. entering the tabs after sign-in). */
  fade?: boolean;
};

/** How far down a sheet the pull-to-close drag may start (Android). Screens with a shorter header pass less. */
export const SHEET_HEADER = 120;

function androidOptions(r: StackRoute, bg: string): StackNavigationOptions {
  const cardStyle = { backgroundColor: r.bg ?? bg };
  if (r.fade) return { cardStyle, gestureEnabled: false, cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter };
  if (r.modal) {
    // The drag starts in the sheet's header (grabber, top bar, title), like the iOS grabber area. Not
    // lower: the JS stack's pan takes touches before a scroll view does, so a list in that band would
    // not scroll (and a drag there could not reach the keyboard-dismissing list either).
    return { ...TransitionPresets.ModalPresentationIOS, presentation: 'modal', cardStyle, gestureEnabled: true, gestureResponseDistance: SHEET_HEADER };
  }
  return { cardStyle };
}

export function AppStack({ bg, routes }: { bg: string; routes: StackRoute[] }) {
  if (Platform.OS === 'android') {
    return (
      <JSStack
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: bg },
          ...TransitionPresets.SlideFromRightIOS,
          gestureEnabled: true,
          // wider than the default 50dp: the outer ~30dp belong to Android's own back gesture
          gestureResponseDistance: 110,
        }}
      >
        {routes.map((r) => <JSStack.Screen key={r.name} name={r.name} options={androidOptions(r, bg)} />)}
      </JSStack>
    );
  }
  return (
    <NativeStack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}>
      {routes.map((r) => (
        <NativeStack.Screen
          key={r.name}
          name={r.name}
          options={{
            ...(r.modal ? { presentation: 'modal' as const } : null),
            ...(r.fade ? { animation: 'fade' as const } : null),
            ...(r.bg ? { contentStyle: { backgroundColor: r.bg } } : null),
          }}
        />
      ))}
    </NativeStack>
  );
}
