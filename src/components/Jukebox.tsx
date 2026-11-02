import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  LayoutAnimationConfig,
  SlideInRight,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatTime, slotCode, Track } from '@/data/mock';
import { usePlayer, usePlayerClock } from '@/state/player';
import { paletteOf } from '@/lib/tracks';
import { colors, type } from '@/theme';
import { Cover } from './Cover';
import { Disc } from './Disc';
import { Icon } from './Icon';
import { SeekBar, tap } from './ui';

/* ---------- turntable ---------- */

function Tonearm({ down }: { down: boolean }) {
  const angle = useSharedValue(down ? 25 : 0);
  const reduce = useReducedMotion();
  useEffect(() => {
    angle.value = reduce ? (down ? 25 : 0) : withTiming(down ? 25 : 0, { duration: 800 });
  }, [down, reduce, angle]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  return (
    <>
      <View style={{ position: 'absolute', left: 189, top: 12, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.label }} />
      <Animated.View style={[{ position: 'absolute', left: 195, top: 19, width: 2, height: 112, backgroundColor: colors.label, transformOrigin: 'top' }, s]}>
        <View style={{ position: 'absolute', left: -3, bottom: -6, width: 8, height: 14, borderRadius: 2, backgroundColor: colors.label }} />
      </Animated.View>
    </>
  );
}

/**
 * The deck. `record` sits on the platter and spins while `playing`; the arm drops onto it. Optional
 * `progress` draws how far into the record we are, `onNext` adds a skip button next to play.
 */
export function Turntable({ record, code, caption, playing, spinning = playing, onToggle, onNext, onPrev, progress, empty = 'Raftan bir plak seç' }: {
  record?: Track; code?: string; caption?: string; playing: boolean; spinning?: boolean; onToggle: () => void; onNext?: () => void; onPrev?: () => void; progress?: number; empty?: string;
}) {
  return (
    <View style={{ height: 180, borderRadius: 20, backgroundColor: colors.card }}>
      <View style={{ position: 'absolute', left: 20, top: 12, width: 156, height: 156, borderRadius: 78, backgroundColor: colors.chrome }} />
      {record && (
        // keyed by record: a new pick remounts and "drops in" from the shelf below
        <Animated.View key={record.id} entering={FadeInDown.springify().damping(15)} style={{ position: 'absolute', left: 20, top: 12 }}>
          <Disc cover={record.cover} size={156} finish="vinyl" label={0.41} spinning={spinning} duration={1800} holeColor={colors.card} />
        </Animated.View>
      )}
      <Tonearm down={!!record && playing} />
      {progress !== undefined && record && (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 6, height: 2, borderRadius: 1, backgroundColor: colors.track }}>
          <View style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`, height: 2, borderRadius: 1, backgroundColor: colors.label }} />
        </View>
      )}
      {/* text and transport in their own boxes right of the tonearm (x≈189–203): together in one column
          the three buttons (136pt) did not fit the ~120pt left on a 375pt-wide iPhone */}
      <View style={{ position: 'absolute', left: 218, top: 16, right: 14, bottom: 68 }}>
        {record ? (
          <>
            {code ? <Text style={[type.numeric, { fontSize: 30, fontWeight: '600' }]}>{code}</Text> : null}
            {caption ? <Text style={[type.caption, { color: colors.secondary, fontWeight: '600', letterSpacing: 0.6 }]} numberOfLines={1}>{caption.toLocaleUpperCase('tr-TR')}</Text> : null}
            <Text style={[type.callout, { fontWeight: '600', marginTop: code ? 8 : 4 }]} numberOfLines={code ? 1 : 2}>{record.title}</Text>
            <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{record.artist}</Text>
          </>
        ) : (
          <Text style={[type.subhead, { color: colors.secondary }]} numberOfLines={4}>{empty}</Text>
        )}
      </View>
      <View style={{ position: 'absolute', left: 208, right: 12, bottom: 14, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {onPrev && record && (
          <Pressable accessibilityRole="button" accessibilityLabel="Önceki plak ya da başa sar" hitSlop={8} onPress={() => { tap(); onPrev(); }}
            style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="prev" size={12} />
          </Pressable>
        )}
        {/* an empty deck has nothing to play: the button reads as off, not as a dead control */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Duraklat' : 'Çal'}
          accessibilityState={{ disabled: !record }}
          disabled={!record}
          onPress={() => { tap(); onToggle(); }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: record ? colors.label : colors.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={playing ? 'pause' : 'play'} size={17} color={colors.white} />
        </Pressable>
        {onNext && record && (
          <Pressable accessibilityRole="button" accessibilityLabel="Sonraki plak" hitSlop={8} onPress={() => { tap(); onNext(); }}
            style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="next" size={12} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Where the needle is, and a way to move it: tap or drag along the line; times follow the finger and
 * the player seeks on release.
 */
export function SeekRow() {
  const player = usePlayer();
  const { position, duration } = usePlayerClock();
  const [scrub, setScrub] = useState<number | null>(null);
  const total = duration || player.track?.duration || 0;
  const shown = scrub !== null ? scrub * total : position;
  return (
    <View style={{ gap: 6 }}>
      <SeekBar ratio={total > 0 ? Math.min(1, position / total) : 0} onSeek={(r) => { if (total > 0) player.seek(r * total); }} onScrub={setScrub} dot={colors.label} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.caption, type.numeric, { color: colors.secondary, fontWeight: '600' }]}>{formatTime(shown)}</Text>
        <Text style={[type.caption, type.numeric, { color: colors.secondary }]}>{total > 0 ? formatTime(shown - total) : '–:––'}</Text>
      </View>
    </View>
  );
}

/* ---------- shelf ---------- */

export type ShelfItem = { id: string; track: Track; heldBy?: string };

function Spine({ item, index, state, onPress, isNew }: {
  item: ShelfItem; index: number; state: 'idle' | 'deck' | 'mine' | 'held'; onPress: () => void; isNew: boolean;
}) {
  const art = paletteOf(item.track);
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withSpring(state === 'mine' ? -18 : state === 'held' ? -10 : 0, { damping: 14 });
  }, [state, lift]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { rotate: state === 'held' ? '-4deg' : '0deg' }] }));

  if (state === 'deck') {
    // empty slot: the record is on the turntable
    return (
      <View accessible accessibilityLabel={`${slotCode(index)}, pikapta`} style={{ width: 30, height: 150, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.label, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Text style={[type.caption, type.numeric, { fontWeight: '600', fontSize: 11 }]}>{slotCode(index)}</Text>
        <Icon name="play" size={10} />
      </View>
    );
  }
  return (
    <Animated.View entering={isNew ? SlideInRight.springify().damping(16) : undefined} style={s}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state === 'held' ? `${item.track.title}, ${item.heldBy} taşıyor` : `${item.track.title} (${slotCode(index)})`}
        accessibilityState={{ selected: state === 'mine' }}
        onPress={() => { tap(); onPress(); }}
        style={{
          width: 30, height: 150, borderRadius: 3, backgroundColor: art.base, alignItems: 'center', paddingTop: 4, overflow: 'visible',
          borderWidth: state === 'mine' ? 2 : 0, borderColor: colors.label,
        }}
      >
        <Cover cover={item.track.cover} size={22} radius={3} />
        <Text style={[type.numeric, { fontSize: 11, fontWeight: '600', color: art.onBase, marginTop: 5 }]}>{slotCode(index)}</Text>
        <View style={{ flex: 1, width: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Text numberOfLines={1} style={{ width: 96, textAlign: 'center', fontSize: 11, fontWeight: '500', color: art.onBase, transform: [{ rotate: '-90deg' }] }}>
            {item.track.title}
          </Text>
        </View>
        {state === 'held' && (
          <View style={{ position: 'absolute', top: -26, left: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.label, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.white, fontSize: 11, fontWeight: '600' }}>{item.heldBy?.[0]?.toLowerCase()}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Shelf({ items, deckId, mineId, onPick, newId, capacity = 10 }: {
  items: ShelfItem[]; deckId?: string; mineId?: string; onPick: (item: ShelfItem) => void; newId?: string; capacity?: number;
}) {
  return (
    <View>
      <LayoutAnimationConfig skipEntering>
        <View style={{ height: 180, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          {Array.from({ length: capacity }).map((_, i) => {
            const it = items[i];
            if (!it) return <View key={`empty-${i}`} style={{ width: 30, height: 150, borderRadius: 3, backgroundColor: colors.fill }} />;
            const state = it.id === deckId ? 'deck' : it.id === mineId ? 'mine' : it.heldBy ? 'held' : 'idle';
            return <Spine key={it.id} item={it} index={i} state={state} isNew={it.id === newId} onPress={() => onPick(it)} />;
          })}
        </View>
      </LayoutAnimationConfig>
      <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.label }} />
    </View>
  );
}
