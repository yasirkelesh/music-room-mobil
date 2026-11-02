import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { formatTime, Track } from '@/data/mock';
import { paletteOf } from '@/lib/tracks';
import { usePlayer, usePlayerClock } from '@/state/player';
import { colors, type } from '@/theme';
import { Disc } from './Disc';
import { Icon } from './Icon';
import { tap } from './ui';
import { readable } from '@/lib/layout';

export function MiniPlayer() {
  const { track } = usePlayer();
  return track ? <View style={readable}><Bar track={track} /></View> : null;
}

/** The same bar, pinned to the bottom of a screen that has no tab bar (e.g. a playlist). */
export function FloatingMiniPlayer() {
  const { track } = usePlayer();
  const insets = useSafeAreaInsets();
  if (!track) return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 8) }}>
      <View style={readable}><Bar track={track} /></View>
    </View>
  );
}

/** Space a tab screen leaves at the end of its scroll view: tab bar + safe area + the mini player when there is one. */
export function useTabInset() {
  const { track } = usePlayer();
  const insets = useSafeAreaInsets();
  return 52 + Math.max(insets.bottom, 8) + (track ? 72 : 0) + 24;
}

/** Space to leave at the end of a scroll view under `FloatingMiniPlayer`. */
export const FLOATING_PLAYER_INSET = 96;

function Bar({ track }: { track: Track }) {
  const { playing, buffering, toggle } = usePlayer();
  const { position } = usePlayerClock();
  const nuance = paletteOf(track).ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Şimdi çalıyor: ${track.title}, ${track.artist}`}
      onPress={() => router.push('/now-playing')}
      style={{
        marginHorizontal: 12, marginBottom: 8, height: 64, borderRadius: 32, backgroundColor: colors.label,
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 10, paddingRight: 8,
      }}
    >
      <Disc cover={track.cover} size={44} finish="picture" spinning={playing && !buffering} holeColor={colors.label} />
      <View style={{ flex: 1 }}>
        <Text style={[type.subhead, { color: colors.white, fontWeight: '600' }]} numberOfLines={1}>{track.title}</Text>
        <Text style={[type.footnote, { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={1}>{track.artist}</Text>
      </View>
      <Text style={[type.subhead, type.numeric, { color: nuance, fontWeight: '600' }]}>{formatTime(position)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Duraklat' : 'Çal'} onPress={() => { tap(); toggle(); }} hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={playing ? 'pause' : 'play'} color={colors.white} size={22} />
      </Pressable>
    </Pressable>
  );
}
