import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/Icon';
import { Shelf, ShelfItem, Turntable } from '@/components/Jukebox';
import { Choice, Group, Pill, Screen, SearchField, tap, TextButton } from '@/components/ui';
import { slotCode, tracks } from '@/data/mock';
import { colors, type } from '@/theme';

type Vis = 'public' | 'private';

export default function NewList() {
  const [name, setName] = useState('Pazar Kasetleri');
  const [shelf, setShelf] = useState<ShelfItem[]>(
    ['moons', 'summer', 'night', 'laundry', 'floppy'].map((id) => ({ id, track: tracks[id] })),
  );
  const [deckId, setDeckId] = useState<string | undefined>('night');
  const [playing, setPlaying] = useState(true);
  const [newId, setNewId] = useState<string>();
  const [visibility, setVisibility] = useState<Vis>('public'); // subject: public by default
  const [editors, setEditors] = useState<Vis>('public'); // subject: everyone can edit by default
  const [q, setQ] = useState('');

  const pool = ['slowmo', 'dialup'].filter((id) => !shelf.some((s) => s.id === id));
  const suggestion = pool[0] ? tracks[pool[0]] : undefined;
  const deckIndex = shelf.findIndex((s) => s.id === deckId);

  const add = (id: string) => {
    if (shelf.length >= 10) return;
    tap();
    setNewId(id);
    setShelf((s) => [...s, { id, track: tracks[id] }]);
  };

  return (
    <Screen scroll>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextButton title="Vazgeç" onPress={() => router.back()} />
        <Text style={[type.subhead, type.numeric, { fontWeight: '600' }]}>LİSTE 04</Text>
      </View>

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 4 }]}>Yeni liste</Text>
      <TextInput
        accessibilityLabel="Liste adı"
        value={name}
        onChangeText={setName}
        style={{ fontSize: 32, fontWeight: '700', color: colors.label, height: 48, borderBottomWidth: 1, borderBottomColor: colors.label, marginTop: 4 }}
      />

      <View style={{ marginTop: 14 }}>
        <Turntable
          record={deckId ? tracks[deckId] : undefined}
          code={deckIndex >= 0 ? slotCode(deckIndex) : undefined}
          playing={!!deckId && playing}
          onToggle={() => setPlaying((p) => !p)}
        />
      </View>

      <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={[type.footnote, { color: colors.secondary }]}>Raf · çalmak için bir plağa dokun</Text>
        <Text style={[type.subhead, type.numeric, { fontWeight: '600' }]}>{String(shelf.length).padStart(2, '0')}/10</Text>
      </View>
      <View style={{ marginTop: 4 }}>
        <Shelf items={shelf} deckId={deckId} newId={newId} onPick={(it) => { setDeckId(it.id); setPlaying(true); setNewId(undefined); }} />
      </View>

      <Group style={{ marginTop: 16 }}>
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={type.subhead}>Kimler görebilir</Text>
          <Choice value={visibility} onChange={setVisibility} options={[{ value: 'public', label: 'Herkes' }, { value: 'private', label: 'Davetliler' }]} />
        </View>
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={type.subhead}>Kimler düzenleyebilir</Text>
          <Choice value={editors} onChange={setEditors} options={[{ value: 'public', label: 'Herkes' }, { value: 'private', label: 'Davetliler' }]} />
        </View>
      </Group>

      <View style={{ marginTop: 16 }}>
        <SearchField placeholder="Rafa şarkı bul" value={q} onChangeText={setQ} accessibilityLabel="Şarkı ara" />
      </View>
      {suggestion && (
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.callout, { fontWeight: '500' }]}>{suggestion.title}</Text>
            <Text style={[type.footnote, { color: colors.secondary }]}>{suggestion.artist}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${suggestion.title} rafa ekle`} onPress={() => add(suggestion.id)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={16} />
          </Pressable>
        </View>
      )}

      {/* TODO: api.createPlaylist({ name, visibility, editors, trackIds }) */}
      <Pill title="Listeyi oluştur" style={{ marginTop: 16 }} onPress={() => router.replace({ pathname: '/list/[id]', params: { id: 'pazar' } })} />
    </Screen>
  );
}
