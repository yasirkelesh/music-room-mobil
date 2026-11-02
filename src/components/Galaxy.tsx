// The party as a small galaxy: the record in the middle, the people around it.

import { ReactNode, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { personOf } from '@/lib/people';
import { colors, type } from '@/theme';
import { Avatar } from './Avatar';
import { Orbit } from './Motion';

export type Star = {
  id: string;
  name: string;
  /** Tracks this person put in the queue; the planet grows with it. */
  weight: number;
  host?: boolean;
  /** Holds the aux: the party plays on their device. */
  aux?: boolean;
  you?: boolean;
  /** Bump to make the planet pulse (they suggested, or their song got a vote). */
  pulse?: number;
};

/** Faint background stars, placed once (seeded, so render stays pure and stable). */
const DUST = (() => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: 46 }, () => ({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 1.3, o: 0.12 + rnd() * 0.4 }));
})();

const planetSize = (s: Star, base: number) => base + Math.min(s.weight, 6) * 3;

function Planet({ star, size, onPress }: { star: Star; size: number; onPress: () => void }) {
  const scale = useSharedValue(1);
  const ripple = useSharedValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!star.pulse || reduce) return;
    scale.value = withSequence(withSpring(1.35, { damping: 6 }), withSpring(1, { damping: 10 }));
    ripple.value = 0;
    ripple.value = withTiming(1, { duration: 900 });
  }, [star.pulse, reduce, scale, ripple]);

  const body = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const wave = useAnimatedStyle(() => ({ opacity: ripple.value === 0 || ripple.value === 1 ? 0 : 0.6 * (1 - ripple.value), transform: [{ scale: 1 + ripple.value * 1.2 }] }));

  const tone = star.host ? { bg: colors.white, fg: colors.black } : star.you ? { bg: colors.label, fg: colors.white } : { bg: colors.graphite, fg: colors.white };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${star.name}${star.host ? ', ev sahibi' : ''}${star.aux ? ', aux onda' : ''}, ${star.weight} şarkı önerdi`}
      onPress={onPress} hitSlop={8} style={{ width: size, height: size, alignItems: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.white }, wave]} />
      {star.aux && (
        <View pointerEvents="none" style={{ position: 'absolute', left: -6, top: -6, width: size + 12, height: size + 12, borderRadius: (size + 12) / 2, backgroundColor: 'rgba(255,255,255,0.18)', shadowColor: colors.white, shadowOpacity: 0.8, shadowRadius: 10 }} />
      )}
      <Animated.View style={body}>
        <Avatar person={personOf(star.name, star.id)} size={size} override={tone} ring={star.you ? colors.white : undefined} />
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', top: size + 3, width: 84, alignItems: 'center' }}>
        {star.aux
          ? <Text style={[type.caption, { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: colors.black, backgroundColor: colors.white, paddingHorizontal: 5, borderRadius: 4, overflow: 'hidden' }]}>AUX</Text>
          : <Text style={[type.caption, { fontSize: 10, color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>{star.you ? 'sen' : star.name.split(' ')[0]}</Text>}
      </View>
    </Pressable>
  );
}

/**
 * Inner ring: the host and whoever put songs in the queue. Outer ring (dashed, the other way): invited
 * guests and you, if you have not suggested yet. Orbits turn while music plays.
 */
export function Galaxy({ width, center, inner, outer, spinning, onSelect }: {
  width: number; center: ReactNode; inner: Star[]; outer: Star[]; spinning: boolean; onSelect: (s: Star) => void;
}) {
  const outerD = width - 56;
  const innerD = Math.round(outerD * 0.7);
  const height = outerD + 44;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
        {DUST.map((d, i) => <Circle key={i} cx={d.x * width} cy={d.y * height} r={d.r} fill="#FFFFFF" opacity={d.o} />)}
      </Svg>
      {outer.length > 0 && (
        <Orbit diameter={outerD} duration={56000} reverse running={spinning} phase={Math.PI * 0.8}
          ringStyle={{ borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.16)' }}
          items={outer.map((s) => { const sz = planetSize(s, 26); return { key: s.id, size: sz, node: <Planet star={s} size={sz} onPress={() => onSelect(s)} /> }; })} />
      )}
      {outer.length === 0 && <View style={{ position: 'absolute', width: outerD, height: outerD, borderRadius: outerD / 2, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }} />}
      <Orbit diameter={innerD} duration={32000} running={spinning}
        ringStyle={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
        items={inner.map((s) => { const sz = planetSize(s, 32); return { key: s.id, size: sz, node: <Planet star={s} size={sz} onPress={() => onSelect(s)} /> }; })} />
      {center}
    </View>
  );
}
