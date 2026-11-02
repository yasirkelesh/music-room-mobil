import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ClipView } from '@/audio/ClipView';
import { Disc } from '@/components/Disc';
import { Icon } from '@/components/Icon';
import { Segments } from '@/components/Party';
import { showTrackMenu } from '@/components/TrackMenu';
import { IconButton, Screen, SeekBar, TextButton } from '@/components/ui';
import { formatTime, Track } from '@/data/mock';
import { useContentWidth } from '@/lib/layout';
import { paletteOf } from '@/lib/tracks';
import { usePlayer, usePlayerClock } from '@/state/player';
import { colors, space, type } from '@/theme';

export default function NowPlaying() {
  const { track } = usePlayer();
  if (!track) {
    return (
      <Screen>
        <View style={{ height: 44, justifyContent: 'center' }}>
          <IconButton icon="down" label="Kapat" onPress={() => router.back()} style={{ alignItems: 'flex-start' }} />
        </View>
        <Text style={[type.subhead, { color: colors.secondary, marginTop: 24 }]}>Henüz bir şey çalmıyor. Bir listeden ya da aramadan bir parça seç.</Text>
      </Screen>
    );
  }
  return <Playing track={track} />;
}

function Playing({ track }: { track: Track }) {
  const { playing, buffering, toggle, next, prev, seek, queue, label, place, error } = usePlayer();
  const [scrub, setScrub] = useState<number | null>(null);
  const [view, setView] = useState<'disc' | 'clip'>('disc');
  const width = useContentWidth() - space.screen * 2;
  const { position, duration } = usePlayerClock();
  const art = paletteOf(track);
  const total = duration || track.duration;
  const shown = scrub !== null ? scrub * total : position;
  return (
    <Screen>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="down" label="Kapat" onPress={() => router.back()} style={{ alignItems: 'flex-start' }} />
        <Text style={[type.footnote, { color: colors.secondary, flex: 1, textAlign: 'center' }]} numberOfLines={1}>{label ? `${label}’den` : ''}</Text>
        <Text style={[type.subhead, type.numeric, { fontWeight: '600', width: 64, textAlign: 'right' }]}>
          {place ? `${String(place.index).padStart(2, '0')}/${String(place.total).padStart(2, '0')}` : ''}
        </Text>
      </View>

      <View style={{ marginTop: 8, alignSelf: 'center', width: 200 }}>
        <Segments light value={view} onChange={setView} options={[{ value: 'disc', label: 'Plak' }, { value: 'clip', label: 'Klip' }]} />
      </View>

      {/* the cover's own colour drives the only nuances on this screen: the glow and the progress */}
      {view === 'disc' ? (
        <View style={{ alignSelf: 'center', marginTop: 20 }}>
          <Disc cover={track.cover} size={Math.min(330, width)} spinning={playing && !buffering} duration={4000} glow={{ color: art.base, radius: 30, offsetY: 24 }} />
        </View>
      ) : (
        // muted video that follows the sound; the record keeps playing underneath
        <View style={{ alignSelf: 'center', marginTop: 20 }}>
          <ClipView videoId={track.id} position={position} playing={playing && !buffering} width={width} />
        </View>
      )}

      <View style={{ marginTop: 32, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={[type.hero, { fontSize: 30 }]} numberOfLines={2}>{track.title}</Text>
          <Text style={[type.body, { color: colors.secondary }]} numberOfLines={1}>{track.artist}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${track.title}: dolaba ekle ya da partiye öner`} onPress={() => showTrackMenu(track)}
          style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Icon name="plus" size={16} />
        </Pressable>
      </View>

      <View style={{ marginTop: 24, gap: 8 }}>
        <SeekBar ratio={total > 0 ? Math.min(1, position / total) : 0} onSeek={(r) => total > 0 && seek(r * total)} onScrub={setScrub} color={art.ink} dot={art.ink} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[type.subhead, type.numeric, { fontWeight: '600' }]}>{formatTime(shown)}</Text>
          <Text style={[type.subhead, type.numeric, { color: colors.secondary }]}>{total > 0 ? formatTime(shown - total) : '–:––'}</Text>
        </View>
      </View>
      {error && <Text accessibilityRole="alert" style={[type.subhead, { color: colors.danger, marginTop: 12 }]}>{error}</Text>}

      <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        <IconButton icon="prev" label="Önceki" size={52} iconSize={28} onPress={prev} />
        <IconButton icon={playing ? 'pause' : 'play'} label={playing ? 'Duraklat' : 'Çal'} size={80} iconSize={28} filled onPress={toggle} />
        <IconButton icon="next" label="Sonraki" size={52} iconSize={28} onPress={next} />
      </View>

      <View style={{ marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[type.footnote, { color: colors.secondary, flex: 1 }]} numberOfLines={1}>
          {queue[0] ? <>Sıradaki · <Text style={{ color: colors.label }}>{queue[0].title}</Text></> : 'Sıra bitti'}
        </Text>
        <TextButton title="Jam’de çal" size={13} onPress={() => { router.back(); router.push('/jam'); }} />
      </View>
    </Screen>
  );
}
