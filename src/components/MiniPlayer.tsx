import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { covers, formatTime } from '@/data/mock';
import { usePlayer } from '@/state/player';
import { colors, type } from '@/theme';
import { Disc } from './Disc';
import { Icon } from './Icon';
import { tap } from './ui';

export function MiniPlayer() {
  const { track, playing, position, toggle } = usePlayer();
  const nuance = covers[track.cover].ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Şimdi çalıyor: ${track.title}, ${track.artist}`}
      onPress={() => router.push('/now-playing')}
      style={{
        marginHorizontal: 12, marginBottom: 8, height: 64, borderRadius: 32, backgroundColor: colors.label,
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 10, paddingRight: 8,
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
      }}
    >
      <Disc cover={track.cover} size={44} finish="picture" spinning={playing} holeColor={colors.label} />
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
