// Building blocks of the party (Jam) screens. Dark surfaces; the only colour comes from the cover.

import { ReactNode, useEffect } from 'react';
import { Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, field, type } from '@/theme';
import { Icon } from './Icon';
import { upperTr } from './ui';

export const dark = {
  text: colors.white,
  sub: 'rgba(255,255,255,0.6)',
  faint: 'rgba(255,255,255,0.35)',
  line: 'rgba(255,255,255,0.12)',
  card: 'rgba(255,255,255,0.08)',
  cardStrong: 'rgba(255,255,255,0.14)',
};

/** A soft wash of the cover's colour behind the top of the screen. */
export function Glow({ color, height = 560, style }: { color: string; height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, height }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="g" cx="50%" cy="28%" rx="75%" ry="55%">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#g)" />
      </Svg>
    </View>
  );
}

/** Fades the bottom of a scroll view into black under a floating bar. */
export function BottomFade({ height = 120 }: { height?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="f" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity={0} />
            <Stop offset="0.55" stopColor="#000" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#000" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#f)" />
      </Svg>
    </View>
  );
}

/** A thin ring around the record that fills as the track plays — the groove as a clock. */
export function ProgressRing({ size, ratio, color = colors.white, children }: { size: number; ratio: number; color?: string; children: ReactNode }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, ratio));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** One vote per person per track: a toggle that shows the live count. */
export function VoteChip({ votes, voted, onPress, label }: { votes: number; voted: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: voted }}
      hitSlop={6}
      onPress={() => { Haptics.impactAsync(voted ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onPress(); }}
      style={({ pressed }) => ({
        minWidth: 58, height: 36, borderRadius: 18, paddingHorizontal: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: voted ? colors.white : 'transparent',
        borderWidth: voted ? 0 : 1, borderColor: 'rgba(255,255,255,0.3)',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Icon name="up" size={11} color={voted ? colors.black : colors.white} />
      <Text style={[type.subhead, type.numeric, { fontWeight: '700', color: voted ? colors.black : colors.white }]}>{votes}</Text>
    </Pressable>
  );
}

/** Small uppercase label used for section heads on dark screens. */
export function Kicker({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 28, marginBottom: 10 }}>
      <Text style={[type.footnote, { color: dark.sub, fontWeight: '600', letterSpacing: 1.2 }]}>{upperTr(children)}</Text>
      {right}
    </View>
  );
}

/** Rounded tag on dark backgrounds (rules, times). */
export function DarkTag({ label, icon }: { label: string; icon?: 'globe' | 'lock' | 'people' | 'pin' }) {
  return (
    <View style={{ height: 28, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: dark.card }}>
      {icon && <Icon name={icon} size={12} color={dark.sub} strokeWidth={2} />}
      <Text style={[type.footnote, { color: dark.sub, fontWeight: '500' }]}>{label}</Text>
    </View>
  );
}

export function DarkSearchField(props: TextInputProps) {
  return (
    <View style={{ minHeight: 44, borderRadius: 12, backgroundColor: dark.cardStrong, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
      <Icon name="search" size={17} color={dark.sub} strokeWidth={2} />
      <TextInput placeholderTextColor={dark.faint} selectionColor={colors.white} style={[field, type.body, { flex: 1, minHeight: 40, color: colors.white }]} {...props} />
    </View>
  );
}

/** Two-way segmented control: dark sheets by default, `light` for the light screens (iOS style). */
export function Segments<T extends string>({ value, onChange, options, light }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; light?: boolean }) {
  return (
    <View style={{ height: 36, borderRadius: 18, padding: 3, flexDirection: 'row', backgroundColor: light ? colors.fill : dark.card }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(o.value); }}
            style={{
              flex: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.white : 'transparent',
              ...(on && light ? { shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } } : null),
            }}>
            <Text style={[type.subhead, { fontWeight: '600', color: on ? colors.black : light ? colors.secondary : dark.sub }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Round transport button for the party's now-playing area. */
export function RoundButton({ icon, label, onPress, size = 52, filled }: { icon: 'play' | 'pause' | 'next' | 'prev'; label: string; onPress: () => void; size?: number; filled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: filled ? colors.white : 'transparent', opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }],
      })}>
      <Icon name={icon} size={filled ? 26 : 26} color={filled ? colors.black : colors.white} />
    </Pressable>
  );
}

/** Translucent full-width button for dark screens (the light one is `Pill variant="light"`). */
export function DarkButton({ title, onPress, icon, height = 50, style }: { title: string; onPress: () => void; icon?: 'play' | 'plus'; height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
      style={({ pressed }) => [{
        height, borderRadius: height / 2, backgroundColor: dark.cardStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        paddingHorizontal: 20, opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}>
      {icon && <Icon name={icon} size={16} color={colors.white} />}
      <Text style={[type.headline, { color: colors.white }]}>{title}</Text>
    </Pressable>
  );
}

/** Three bouncing bars: "this one is playing". Holds still when paused or with Reduce Motion. */
export function PlayingBars({ playing, color = colors.white, size = 14 }: { playing: boolean; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      {[0, 1, 2].map((i) => <Bar key={i} i={i} playing={playing} color={color} size={size} />)}
    </View>
  );
}

function Bar({ i, playing, color, size }: { i: number; playing: boolean; color: string; size: number }) {
  const h = useSharedValue(0.4);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!playing || reduce) { cancelAnimation(h); h.value = withTiming([0.5, 0.8, 0.35][i], { duration: 200 }); return; }
    h.value = withRepeat(withSequence(
      withTiming(1, { duration: 260 + i * 90 }),
      withTiming(0.25, { duration: 300 + i * 70 }),
    ), -1, true);
    return () => cancelAnimation(h);
  }, [playing, reduce, i, h]);
  const st = useAnimatedStyle(() => ({ height: Math.max(2, h.value * size) }));
  return <Animated.View style={[{ width: Math.max(2, size / 5), borderRadius: 1, backgroundColor: color }, st]} />;
}
