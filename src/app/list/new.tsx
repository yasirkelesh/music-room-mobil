import { useState } from 'react';
import { Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { LicenceMode, Visibility } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Shelf, ShelfItem, Turntable } from '@/components/Jukebox';
import { FieldHint, FormError, Pill, Screen, tap, TextButton } from '@/components/ui';
import { slotCode, Track } from '@/data/mock';
import { AddSongs } from '@/components/AddSongs';
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
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
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

      {/* Opens the full search (20 results, your other lists) instead of a few inline suggestions */}
      <Pressable accessibilityRole="search" accessibilityLabel="Rafa şarkı bul" disabled={shelf.length >= CAPACITY} onPress={() => { tap(); setPicking(true); }}
        style={({ pressed }) => ({ marginTop: 16, minHeight: 44, borderRadius: 10, backgroundColor: colors.fill, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, opacity: shelf.length >= CAPACITY ? 0.5 : pressed ? 0.7 : 1 })}>
        <Icon name="search" size={17} color={colors.tertiary} strokeWidth={2} />
        <Text style={[type.body, { flex: 1, color: colors.tertiary }]}>Rafa şarkı bul</Text>
        <Icon name="plus" size={16} color={colors.secondary} />
      </Pressable>
      {shelf.length >= CAPACITY && <Text style={[type.footnote, { color: colors.secondary, marginTop: 8 }]}>Raf dolu. Daha fazlasını liste oluşunca ekleyebilirsin.</Text>}

      <Modal visible={picking} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
        statusBarTranslucent onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, backgroundColor: '#111', paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}>
          <AddSongs
            embedded
            title="Rafa plak ekle"
            existing={new Set(shelf.map((x) => x.id))}
            existsLabel="Rafta"
            emptyHint={`Aramak için en az iki harf yaz ya da başka bir listenden seç. Rafa ${CAPACITY} plak sığar.`}
            addedText={(t) => `“${t.title}” rafa kondu · ${Math.min(shelf.length + 1, CAPACITY)}/${CAPACITY}`}
            onAdd={async (t) => {
              if (shelf.some((x) => x.id === t.id)) return 'exists';
              if (shelf.length >= CAPACITY) return { error: 'Raf dolu' };
              add(t);
              return 'added';
            }}
            onDone={() => setPicking(false)}
          />
        </View>
      </Modal>

      <FormError message={error} />
      <Pill title={busy ? 'Oluşturuluyor…' : 'Listeyi oluştur'} disabled={busy || name.trim().length === 0} style={{ marginTop: 16 }} onPress={create} />
      {!name.trim() && <FieldHint>Oluşturmak için yukarıya bir liste adı yaz.</FieldHint>}
    </Screen>
  );
}
