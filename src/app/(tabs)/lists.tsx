import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mosaic } from '@/components/Cover';
import { IconButton } from '@/components/ui';
import { playlists, tracks } from '@/data/mock';
import { colors, TAB_INSET, type } from '@/theme';

export default function Lists() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_INSET }}>
        <View style={{ height: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
          <IconButton icon="plus" label="Yeni liste" onPress={() => router.push('/list/new')} />
        </View>
        <Text accessibilityRole="header" style={type.largeTitle}>Listeler</Text>
        <View style={{ marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 }}>
          {playlists.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/list/[id]', params: { id: p.id } })} style={{ width: '48%' }}>
              <Mosaic items={p.trackIds.map((id) => tracks[id].cover)} size={170} radius={12} />
              <Text style={[type.subhead, { fontWeight: '600', marginTop: 8 }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[type.footnote, { color: colors.secondary }]}>{p.trackIds.length} plak{p.sharedWith ? ` · ${p.sharedWith} kişiyle` : ''}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
