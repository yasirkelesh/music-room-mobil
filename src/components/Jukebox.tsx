import { useEffect } from 'react';
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
import { covers, CoverKey, slotCode, Track } from '@/data/mock';
import { colors, type } from '@/theme';
import { Cover } from './Cover';
import { Disc } from './Disc';
import { Icon } from './Icon';
import { tap } from './ui';

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

export function Turntable({ record, code, playing, onToggle }: { record?: Track; code?: string; playing: boolean; onToggle: () => void }) {
  return (
    <View style={{ height: 180, borderRadius: 20, backgroundColor: colors.card }}>
      <View style={{ position: 'absolute', left: 20, top: 12, width: 156, height: 156, borderRadius: 78, backgroundColor: colors.chrome }} />
      {record && (
        // keyed by record: a new pick remounts and "drops in" from the shelf below
        <Animated.View key={record.id} entering={FadeInDown.springify().damping(15)} style={{ position: 'absolute', left: 20, top: 12 }}>
          <Disc cover={record.cover} size={156} finish="vinyl" label={0.41} spinning={playing} duration={1800} holeColor={colors.card} />
        </Animated.View>
      )}
      <Tonearm down={!!record && playing} />
      <View style={{ position: 'absolute', left: 218, top: 16, right: 16, bottom: 16 }}>
        {record ? (
          <>
            <Text style={[type.numeric, { fontSize: 30, fontWeight: '600' }]}>{code}</Text>
            <Text style={[type.callout, { fontWeight: '600', marginTop: 8 }]} numberOfLines={2}>{record.title}</Text>
            <Text style={[type.footnote, { color: colors.secondary }]}>{record.artist}</Text>
          </>
        ) : (
          <Text style={[type.subhead, { color: colors.secondary }]}>Raftan bir plak seç</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Duraklat' : 'Çal'}
          onPress={() => { tap(); onToggle(); }}
          style={{ marginTop: 'auto', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={playing ? 'pause' : 'play'} size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- shelf ---------- */

export type ShelfItem = { id: string; track: Track; heldBy?: string };

function Spine({ item, index, state, onPress, isNew }: {
  item: ShelfItem; index: number; state: 'idle' | 'deck' | 'mine' | 'held'; onPress: () => void; isNew: boolean;
}) {
  const art = covers[item.track.cover as CoverKey];
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withSpring(state === 'mine' ? -18 : state === 'held' ? -10 : 0, { damping: 14 });
  }, [state, lift]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { rotate: state === 'held' ? '-4deg' : '0deg' }] }));

  if (state === 'deck') {
    // empty slot: the record is on the turntable
    return (
      <View style={{ width: 30, height: 150, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.label, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Text style={[type.caption, type.numeric, { fontWeight: '600', fontSize: 11 }]}>{slotCode(index)}</Text>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.label }} />
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
