import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { LicenceMode, Visibility } from '@/api/types';
import { Cover } from '@/components/Cover';
import { Disc } from '@/components/Disc';
import { Icon } from '@/components/Icon';
import { Shelf, ShelfItem, Turntable } from '@/components/Jukebox';
import { FieldHint, FormError, Pill, Screen, SearchField, tap, TextButton } from '@/components/ui';
import { formatTime, slotCode, Track } from '@/data/mock';
import { useTrackSearch } from '@/lib/useTrackSearch';
import { usePlayer } from '@/state/player';
import { colors, field, type } from '@/theme';
import { Segments } from '@/components/Party';

type Vis = 'public' | 'private';
const CAPACITY = 10; // one shelf; more can be added from the cabinet afterwards
const SOURCE = 'new-list';

/** A new record cabinet: name it, fill the shelf, listen on the deck, set who may see and edit it. */
export default function NewList() {
  const player = usePlayer();
  const [name, setName] = useState('');
  const [shelf, setShelf] = useState<ShelfItem[]>([]);
  const [deckId, setDeckId] = useState<string | undefined>();
  const [newId, setNewId] = useState<string>();
  const [visibility, setVisibility] = useState<Vis>('public'); // subject: public by default
  const [editors, setEditors] = useState<Vis>('public'); // subject: everyone can edit by default
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = useTrackSearch(q, 5);

  const suggestions = search.results.filter((t) => !shelf.some((s) => s.id === t.id)).slice(0, 3);
  const deckIndex = shelf.findIndex((s) => s.id === deckId);
  const deck = deckIndex >= 0 ? shelf[deckIndex].track : undefined;
  const previewing = player.source === SOURCE;

  const add = (t: Track) => {
    if (shelf.length >= CAPACITY) return;
    tap();
    setNewId(t.id);
    setShelf((s) => [...s, { id: t.id, track: t }]);
  };

  // Listening before saving: the deck really plays, through the app's player.
  const putOnDeck = (it: ShelfItem) => {
    const i = shelf.findIndex((s) => s.id === it.id);
    setDeckId(it.id);
    setNewId(undefined);
    player.playList(shelf.map((s) => s.track), i, name.trim() || 'Yeni liste', SOURCE);
  };
  const toggle = () => {
    if (!deck) { if (shelf[0]) putOnDeck(shelf[0]); return; }
    if (previewing) player.toggle(); else putOnDeck(shelf[deckIndex]);
  };
  const takeOff = () => {
    if (!deckId) return;
    if (previewing && player.track?.id === deckId) player.stop();
    setShelf((s) => s.filter((x) => x.id !== deckId));
    setDeckId(undefined);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { playlistId } = await api.playlists.create({
        name: name.trim(),
        visibility: visibility === 'public' ? Visibility.Public : Visibility.Private,
        licence: editors === 'public' ? LicenceMode.Everyone : LicenceMode.InvitedOnly,
      });
      // Each add changes the playlist's version, so the next one needs a fresh ETag.
      for (const it of shelf) {
        const { etag } = await api.playlists.allTracks(playlistId);
        await api.playlists.addTrack(playlistId, { youtubeVideoId: it.id }, etag ?? '');
      }
      router.replace({ pathname: '/list/[id]', params: { id: playlistId } });
    } catch (e) {
      setError(describeError(e));
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextButton title="Vazgeç" onPress={() => router.back()} />
        <Text style={[type.subhead, { fontWeight: '600' }]}>YENİ LİSTE</Text>
      </View>

      <Text style={[type.footnote, { color: colors.secondary, marginTop: 4 }]}>Ad</Text>
      <TextInput
        accessibilityLabel="Liste adı"
        value={name}
        onChangeText={setName}
        placeholder="Liste adı"
        placeholderTextColor={colors.tertiary}
        returnKeyType="done"
        maxFontSizeMultiplier={1.3} style={[field, { fontSize: 32, fontWeight: '700', color: colors.label, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.label, marginTop: 4 }]}
      />

      <View style={{ marginTop: 14 }}>
        <Turntable
          record={deck}
          code={deckIndex >= 0 ? slotCode(deckIndex) : undefined}
          playing={previewing && player.playing}
          spinning={previewing && player.playing && !player.buffering}
          onToggle={toggle}
          empty={shelf.length ? 'Dinlemek için raftan bir plak seç' : 'Aşağıdan rafa plak ekle'}
        />
      </View>

      <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={[type.footnote, { color: colors.secondary }]}>Raf · dinlemek için bir plağa dokun</Text>
        <Text style={[type.subhead, type.numeric, { fontWeight: '600' }]}>{String(shelf.length).padStart(2, '0')}/{CAPACITY}</Text>
      </View>
      <View style={{ marginTop: 4 }}>
        <Shelf items={shelf} deckId={deckId} newId={newId} onPick={putOnDeck} />
      </View>
      {deck && (
        <View style={{ alignItems: 'flex-end' }}>
          <TextButton title="Pikaptaki plağı raftan çıkar" size={13} muted onPress={takeOff} />
        </View>
      )}

      {/* label above, full-width control: side by side they overflowed on narrow Android screens */}
      <Text style={[type.footnote, { color: colors.secondary, marginTop: 20, marginBottom: 8 }]}>Kimler görebilir</Text>
      <Segments light value={visibility} onChange={setVisibility} options={[{ value: 'public', label: 'Herkes' }, { value: 'private', label: 'Davetliler' }]} />
      <Text style={[type.footnote, { color: colors.secondary, marginTop: 16, marginBottom: 8 }]}>Kimler düzenleyebilir</Text>
      <Segments light value={editors} onChange={setEditors} options={[{ value: 'public', label: 'Herkes' }, { value: 'private', label: 'Davetliler' }]} />
      <Text style={[type.footnote, { color: colors.secondary, marginTop: 8, lineHeight: 18 }]}>
        {visibility === 'public' ? 'Liste keşfette görünür.' : 'Sadece davet ettiklerin görür.'} {editors === 'public' ? 'Görebilen herkes plak ekleyebilir.' : 'Plakları sadece davet ettiklerin değiştirir.'}
      </Text>

      <View style={{ marginTop: 16 }}>
        <SearchField placeholder="Rafa şarkı bul" value={q} onChangeText={setQ} autoCorrect={false} accessibilityLabel="Şarkı ara" />
      </View>
      {shelf.length >= CAPACITY && <Text style={[type.footnote, { color: colors.secondary, marginTop: 8 }]}>Raf dolu. Daha fazlasını liste oluşunca ekleyebilirsin.</Text>}
      {/* same rows as the Ara tab: the sleeve, its record peeking out, two lines for long titles */}
      {suggestions.map((t) => (
        <View key={t.id} style={{ minHeight: 64, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 52, height: 44 }}>
            <View style={{ position: 'absolute', left: 10, top: 1 }}>
              <Disc cover={t.cover} size={42} finish="vinyl" label={0.42} holeColor={colors.bg} />
            </View>
            <Cover cover={t.cover} size={44} radius={4} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.callout, { fontWeight: '500' }]} numberOfLines={2}>{t.title}</Text>
            <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{t.artist}{t.duration ? ` · ${formatTime(t.duration)}` : ''}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t.title} rafa ekle`} disabled={shelf.length >= CAPACITY} onPress={() => add(t)}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.label, alignItems: 'center', justifyContent: 'center', opacity: shelf.length >= CAPACITY ? 0.3 : 1 }}>
            <Icon name="plus" size={16} />
          </Pressable>
        </View>
      ))}
      <FormError message={search.error} />

      <FormError message={error} />
      <Pill title={busy ? 'Oluşturuluyor…' : 'Listeyi oluştur'} disabled={busy || name.trim().length === 0} style={{ marginTop: 16 }} onPress={create} />
      {!name.trim() && <FieldHint>Oluşturmak için yukarıya bir liste adı yaz.</FieldHint>}
    </Screen>
  );
}
