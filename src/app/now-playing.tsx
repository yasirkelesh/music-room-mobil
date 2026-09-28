import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Disc } from '@/components/Disc';
import { IconButton, Progress, Screen, TextButton } from '@/components/ui';
import { covers, formatTime } from '@/data/mock';
import { usePlayer } from '@/state/player';
import { colors, type } from '@/theme';

export default function NowPlaying() {
  const { track, playing, position, toggle, next, prev, queue } = usePlayer();
  const art = covers[track.cover];
  return (
    <Screen>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="down" label="Kapat" onPress={() => router.back()} style={{ alignItems: 'flex-start' }} />
        <Text style={[type.footnote, { color: colors.secondary }]}>Pazar Kasetleri’nden</Text>
        <Text style={[type.subhead, type.numeric, { fontWeight: '600', width: 44, textAlign: 'right' }]}>07/24</Text>
      </View>

      {/* the cover's own colour drives the only nuances on this screen: the glow and the progress */}
      <View style={{ alignSelf: 'center', marginTop: 16 }}>
        <Disc cover={track.cover} size={330} spinning={playing} duration={4000} glow={{ color: art.base, radius: 30, offsetY: 24 }} />
      </View>

      <View style={{ marginTop: 40, gap: 4 }}>
        <Text style={[type.hero, { fontSize: 30 }]} numberOfLines={1}>{track.title}</Text>
        <Text style={[type.body, { color: colors.secondary }]}>{track.artist}</Text>
      </View>

      <View style={{ marginTop: 24, gap: 8 }}>
        <Progress ratio={position / track.duration} color={art.ink} dot={art.ink} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[type.subhead, type.numeric, { fontWeight: '600' }]}>{formatTime(position)}</Text>
          <Text style={[type.subhead, type.numeric, { color: colors.secondary }]}>{formatTime(position - track.duration)}</Text>
        </View>
      </View>

      <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        <IconButton icon="prev" label="Önceki" size={52} iconSize={28} onPress={prev} />
        <IconButton icon={playing ? 'pause' : 'play'} label={playing ? 'Duraklat' : 'Çal'} size={80} iconSize={28} filled onPress={toggle} />
        <IconButton icon="next" label="Sonraki" size={52} iconSize={28} onPress={next} />
      </View>

      <View style={{ marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[type.footnote, { color: colors.secondary }]}>Sıradaki · <Text style={{ color: colors.label }}>{queue[0]?.title}</Text></Text>
        <TextButton title="Jam’de çal" size={13} onPress={() => { router.back(); router.push('/jam'); }} />
      </View>
    </Screen>
  );
}
