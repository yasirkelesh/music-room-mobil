import { ReactNode, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Continuous rotation. Stops (and holds its angle) when `running` is false or Reduce Motion is on. */
export function useSpin(durationMs: number, running = true, reverse = false) {
  const angle = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!running || reduce) {
      cancelAnimation(angle);
      return;
    }
    const from = angle.value % 360;
    angle.value = from;
    angle.value = withRepeat(withTiming(from + 360, { duration: durationMs, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(angle);
  }, [running, reduce, durationMs, angle]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${reverse ? -angle.value : angle.value}deg` }] }));
}

export function Spin({ children, duration = 3600, running = true, reverse = false, style }: {
  children: ReactNode; duration?: number; running?: boolean; reverse?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const s = useSpin(duration, running, reverse);
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/**
 * Items travelling around a ring. The ring rotates; each item counter-rotates
 * so avatars and covers stay upright.
 */
export function Orbit({ diameter, items, duration = 30000, reverse = false, running = true, ringStyle }: {
  diameter: number;
  items: { key: string; node: ReactNode; size: number }[];
  duration?: number;
  reverse?: boolean;
  running?: boolean;
  ringStyle?: StyleProp<ViewStyle>;
}) {
  const ring = useSpin(duration, running, reverse);
  const keep = useSpin(duration, running, !reverse);
  const r = diameter / 2;
  return (
    <Animated.View style={[{ position: 'absolute', width: diameter, height: diameter, borderRadius: r }, ringStyle, ring]}>
      {items.map((it, i) => {
        const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <View key={it.key} style={{ position: 'absolute', left: r + Math.cos(a) * r - it.size / 2, top: r + Math.sin(a) * r - it.size / 2 }}>
            <Animated.View style={keep}>{it.node}</Animated.View>
          </View>
        );
      })}
    </Animated.View>
  );
}
