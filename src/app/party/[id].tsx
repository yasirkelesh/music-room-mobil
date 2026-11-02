import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { LicenceMode, QueueEntry, Visibility } from '@/api/types';
import { Galaxy, Star } from '@/components/Galaxy';
import { Blink } from '@/components/Blink';
import { Cover } from '@/components/Cover';
import { Disc } from '@/components/Disc';
import { Icon } from '@/components/Icon';
import { BottomFade, dark, DarkButton, DarkTag, Glow, Kicker, ProgressRing, RoundButton, VoteChip } from '@/components/Party';
import { FormError, Pill } from '@/components/ui';
import { Track, formatTime } from '@/data/mock';
import { useAsync } from '@/lib/useAsync';
import { paletteOf, useTracks } from '@/lib/tracks';
import { useRoom } from '@/lib/useRoom';
import { useUserNames } from '@/lib/userNames';
import { usePlayer, usePlayerClock } from '@/state/player';
import { colors, field, type } from '@/theme';
import { Action, SheetSubject, showActions } from '@/components/ActionSheet';
import { readable, useContentWidth } from '@/lib/layout';

const hm = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/**
 * A live party (V.2.1): what is playing, and the queue everybody votes on. One vote per person per track;
 * the order is by votes, then by who suggested first. The record plays on whichever device started the
 * party's playback session; everyone else votes and adds songs.
 */
export default function Party() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useRoom(id);
  const player = usePlayer();
  const { position, duration } = usePlayerClock();
  const [now, setNow] = useState(() => Date.now());
  const [shownCode, setShownCode] = useState<string | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const meta = useTracks(room.queue.map((q) => q.youtubeVideoId));
  const width = useContentWidth();
  const discSize = Math.round((width - 56) * 0.7 * 0.6);
  const [selected, setSelected] = useState<string | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const guests = useAsync(() => (room.isOwner ? api.events.invitations(id) : Promise.resolve([])), [id, room.isOwner]);

  // Who put how many songs in the queue (the planets' size).
  const counts = new Map<string, number>();
  for (const q of room.queue) counts.set(q.suggestedByUserId, (counts.get(q.suggestedByUserId) ?? 0) + 1);
  const people = [...new Set([room.event?.ownerId, ...counts.keys(), ...(guests.data ?? []).map((g) => g.userId), room.userId].filter(Boolean) as string[])];
  const names = useUserNames(people);

  // A new suggestion, or a vote on someone's song, makes their planet pulse.
  const seen = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    const prev = seen.current;
    seen.current = new Map(room.queue.map((q) => [q.suggestionId, q.votes]));
    if (!prev) return;
    const who = room.queue.filter((q) => !prev.has(q.suggestionId) || q.votes > (prev.get(q.suggestionId) ?? 0)).map((q) => q.suggestedByUserId);
    if (!who.length) return;
    const t = setTimeout(() => setPulses((p) => { const n = { ...p }; for (const u of who) n[u] = (n[u] ?? 0) + 1; return n; }), 0);
    return () => clearTimeout(t);
  }, [room.queue]);
  useEffect(() => { if (!selected) return; const t = setTimeout(() => setSelected(null), 3500); return () => clearTimeout(t); }, [selected]);

  if (room.loading && !room.event) return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  if (!room.event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.black, paddingHorizontal: 20 }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ height: 44, justifyContent: 'center' }}><Icon name="down" color={colors.white} /></Pressable>
        <FormError message={room.error ? describeError(room.error) : 'Parti bulunamadı.'} style={{ color: '#FF8A7A' }} />
      </SafeAreaView>
    );
  }

  const ev = room.event;
  const live = now >= new Date(ev.startsAtUtc).getTime() && now <= new Date(ev.endsAtUtc).getTime();
  const nowT = room.nowTrack;
  const upNext = room.queue.filter((q) => q.suggestionId !== room.session?.nowPlayingId);
  const [next, ...rest] = upNext;
  // Before anything plays, the record previews what will play first.
  const shown = nowT ?? (next ? meta[next.youtubeVideoId] : null);
  const glow = shown ? paletteOf(shown).base : '#3A3A3C';
  const total = duration || nowT?.duration || 0;
  const star = (uid: string): Star => ({
    id: uid,
    name: uid === ev.ownerId && names[uid] === '…' ? 'Ev sahibi' : names[uid],
    weight: counts.get(uid) ?? 0,
    host: uid === ev.ownerId,
    you: uid === room.userId,
    aux: room.isMine && uid === room.userId,
    pulse: pulses[uid],
  });
  const inner = people.filter((u) => u === ev.ownerId || (counts.get(u) ?? 0) > 0).map(star)
    .sort((a, b) => Number(!!b.host) - Number(!!a.host) || b.weight - a.weight);
  const outer = people.filter((u) => u !== ev.ownerId && !(counts.get(u) ?? 0)).map(star);
  const picked = [...inner, ...outer].find((x) => x.id === selected);
  const by = (uid: string) => (uid === room.userId ? 'sen' : names[uid]);
  const canRemove = (q: QueueEntry) => q.suggestedByUserId === room.userId || room.isOwner;

  const sheet = (subject: SheetSubject, items: Action[]) => {
    if (items.length === 0) return;
    showActions(subject, items, { dark: true });
  };

  const showCode = async () => {
    try { setShownCode(await room.issueCode()); } catch (e) { room.setNotice(describeError(e)); }
  };

  const menu = () => {
    const items: Action[] = [];
    if (room.isOwner) items.push({ label: 'Partiyi düzenle', icon: 'edit', run: () => router.push({ pathname: '/party/rules', params: { id: ev.eventId } }) });
    if (room.isOwner && ev.licence === LicenceMode.LocationAndTimeRestricted) items.push({ label: 'Mekân kodu üret', icon: 'lock', run: showCode });
    if (room.isMine) items.push({ label: 'Aux’u devret', icon: 'speaker', run: () => router.push('/room/handover') });
    if (room.isMine) items.push({ label: 'Bu cihazda çalmayı durdur', icon: 'pause', destructive: true, run: () => room.stopPlaying() });
    if (!room.isOwner) items.push({
      label: 'Partiden ayrıl', icon: 'back', destructive: true,
      run: async () => { await room.leave(); router.back(); },
    });
    if (room.isOwner) items.push({
      label: 'Partiyi sil', icon: 'close', destructive: true,
      run: () => Alert.alert('Partiyi sil', `“${ev.name}” silinsin mi?`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: async () => { await room.stopPlaying(); try { await api.events.remove(ev.eventId); router.back(); } catch (e) { room.setNotice(describeError(e)); } } },
      ]),
    });
    sheet({ title: ev.name }, items);
  };

  const rowMenu = (q: QueueEntry, t: Track) => {
    const items: Action[] = [];
    // The device playing the party may override the votes once.
    if (room.isMine) items.push({ label: 'Şimdi çal', icon: 'play', run: () => room.jumpTo(q.suggestionId) });
    items.push({ label: q.callerVoted ? 'Oyumu geri al' : 'Oy ver', icon: 'up', run: () => room.toggleVote(q) });
    if (canRemove(q)) items.push({ label: 'Sıradan kaldır', icon: 'close', destructive: true, run: () => room.removeSuggestion(q.suggestionId) });
    sheet({ title: t.title, subtitle: t.artist, cover: t.cover }, items);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <Glow color={glow} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* header */}
        <View style={{ height: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={8} onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="down" color={colors.white} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            {live && <Blink><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4D4D' }} /></Blink>}
            <Text style={[type.footnote, { color: colors.white, fontWeight: '700', letterSpacing: 1.4 }]}>{live ? 'CANLI' : `${hm(ev.startsAtUtc)}’DE BAŞLIYOR`}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Seçenekler" hitSlop={8} onPress={menu} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="more" color={colors.white} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ ...readable, paddingHorizontal: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* title */}
          <Text accessibilityRole="header" style={[type.hero, { color: colors.white, fontSize: 36, lineHeight: 40, textAlign: 'center', marginTop: 4 }]} numberOfLines={2}>{ev.name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <DarkTag icon={ev.visibility === Visibility.Public ? 'globe' : 'lock'} label={ev.visibility === Visibility.Public ? 'Herkese açık' : 'Özel'} />
            <DarkTag icon={ev.licence === LicenceMode.LocationAndTimeRestricted ? 'pin' : 'people'} label={ev.licence === LicenceMode.Everyone ? 'Herkes oylar' : ev.licence === LicenceMode.InvitedOnly ? 'Davetliler oylar' : 'Mekândakiler oylar'} />
            <DarkTag label={`${hm(ev.startsAtUtc)}–${hm(ev.endsAtUtc)}`} />
          </View>

          {/* the galaxy: the record in the middle, the people around it */}
          <View style={{ marginHorizontal: -20, marginTop: 8, alignItems: 'center' }}>
            <Galaxy
              width={width}
              inner={inner}
              outer={outer}
              spinning={!!room.session && (!room.isMine || player.playing)}
              onSelect={(st) => { Haptics.selectionAsync().catch(() => {}); setSelected(st.id); }}
              center={room.isMine ? (
                <ProgressRing size={discSize + 22} ratio={total > 0 ? position / total : 0}>
                  <Disc cover={nowT?.cover ?? 'dialup'} size={discSize} spinning={player.playing && !player.buffering} label={0.5} holeColor={colors.black} glow={{ color: glow, radius: 40, opacity: 0.5 }} />
                </ProgressRing>
              ) : (
                <View style={{ opacity: nowT ? 1 : 0.5 }}>
                  <Disc cover={shown?.cover ?? 'dialup'} size={discSize} spinning={!!nowT} label={0.5} holeColor={colors.black} glow={{ color: glow, radius: 40, opacity: 0.5 }} />
                </View>
              )}
            />
          </View>
          <Text style={[type.footnote, { color: dark.sub, textAlign: 'center', marginTop: -4 }]} numberOfLines={1}>
            {picked
              ? `${picked.you ? 'Sen' : picked.name} · ${picked.weight ? `${picked.weight} şarkı önerdi` : 'henüz şarkı önermedi'}${picked.host ? ' · ev sahibi' : ''}${picked.aux ? ' · aux onda' : ''}`
              : `${inner.length + outer.length} kişi yörüngede · büyük gezegen, çok öneri`}
          </Text>

          <Animated.View key={nowT?.id ?? 'none'} entering={FadeIn.duration(250)} style={{ alignItems: 'center', marginTop: 22, minHeight: 52 }}>
            <Text style={[type.title2, { color: colors.white, textAlign: 'center' }]} numberOfLines={1}>{nowT ? nowT.title : room.session ? 'Sıra bitti' : 'Henüz çalmıyor'}</Text>
            <Text style={[type.subhead, { color: dark.sub, marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
              {nowT ? nowT.artist : room.session ? 'Yeni bir şarkı ekleyin' : 'Bir cihaz partiyi başlatınca burada görünür'}
            </Text>
          </Animated.View>

          {/* transport, or how to start */}
          {room.isMine ? (
            <View style={{ marginTop: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <Text style={[type.caption, type.numeric, { color: dark.sub }]}>{formatTime(position)}</Text>
                <Text style={[type.caption, type.numeric, { color: dark.sub }]}>{total > 0 ? formatTime(position - total) : '–:––'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36, marginTop: 6 }}>
                <RoundButton icon="prev" label="Başa sar" onPress={player.prev} />
                <RoundButton icon={player.playing ? 'pause' : 'play'} label={player.playing ? 'Duraklat' : 'Çal'} filled size={72} onPress={player.toggle} />
                <RoundButton icon="next" label="Sıradakine geç" onPress={room.advance} />
              </View>
              <Text style={[type.caption, { color: dark.faint, textAlign: 'center', marginTop: 10 }]}>Bu cihazda çalıyor · sıradakini oylar belirler</Text>
            </View>
          ) : (
            <View style={{ marginTop: 18, alignItems: 'center', gap: 10 }}>
              {room.session && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="speaker" size={14} color={dark.sub} />
                  <Text style={[type.footnote, { color: dark.sub }]}>Başka bir cihazda çalıyor</Text>
                </View>
              )}
              {room.session ? (
                <DarkButton title="Bu cihazda çal" icon="play" style={{ alignSelf: 'stretch', marginHorizontal: 24 }} onPress={room.startPlaying} />
              ) : (
                <Pill title="Partiyi bu cihazda başlat" variant="light" height={50} style={{ alignSelf: 'stretch', marginHorizontal: 24 }}
                  left={<Icon name="play" size={16} color={colors.black} />}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); room.startPlaying(); }} />
              )}
            </View>
          )}
          {room.isMine && player.error && <Text accessibilityRole="alert" style={[type.footnote, { color: '#FF8A7A', textAlign: 'center', marginTop: 8 }]}>{player.error}</Text>}

          {room.notice && (
            <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOut} style={{ marginTop: 18, borderRadius: 16, backgroundColor: dark.cardStrong, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={[type.subhead, { flex: 1, color: colors.white, lineHeight: 20 }]}>{room.notice}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={8} onPress={() => room.setNotice(null)}><Icon name="close" size={14} color={dark.sub} /></Pressable>
            </Animated.View>
          )}

          {/* queue */}
          <Kicker right={<Text style={[type.footnote, { color: dark.faint }]}>{upNext.length ? `${upNext.length} şarkı` : ''}</Text>}>Sıradaki</Kicker>

          {!next && (
            <View style={{ borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: dark.line, padding: 24, alignItems: 'center', gap: 6 }}>
              <Text style={[type.headline, { color: colors.white }]}>Sıra boş</Text>
              <Text style={[type.footnote, { color: dark.sub, textAlign: 'center' }]}>İlk şarkıyı sen ekle; herkes oylayınca sıra kendini düzenler.</Text>
            </View>
          )}

          {next && (() => {
            const t = meta[next.youtubeVideoId];
            return (
              <Animated.View layout={LinearTransition.springify().damping(18)}>
                <Pressable onLongPress={() => rowMenu(next, t)} delayLongPress={350}
                  style={{ borderRadius: 20, backgroundColor: dark.card, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Cover cover={t.cover} size={64} radius={12} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.caption, { color: dark.sub, fontWeight: '700', letterSpacing: 1 }]}>{room.session ? 'SONRAKİ' : 'İLK ÇALACAK'}</Text>
                    <Text style={[type.headline, { color: colors.white, marginTop: 2 }]} numberOfLines={1}>{t.title}</Text>
                    <Text style={[type.footnote, { color: dark.sub }]} numberOfLines={1}>{t.artist ? `${t.artist} · ` : ''}{by(next.suggestedByUserId)}</Text>
                  </View>
                  <VoteChip votes={next.votes} voted={next.callerVoted} label={`${t.title} için oy ver`} onPress={() => room.toggleVote(next)} />
                </Pressable>
              </Animated.View>
            );
          })()}

          <View style={{ marginTop: 6 }}>
            {rest.map((q, i) => {
              const t = meta[q.youtubeVideoId];
              return (
                <Animated.View key={q.suggestionId} layout={LinearTransition.springify().damping(18)} entering={FadeIn}>
                  <Pressable onLongPress={() => rowMenu(q, t)} delayLongPress={350}
                    style={{ height: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: i === rest.length - 1 ? 0 : 0.5, borderBottomColor: dark.line }}>
                    <Text style={[type.subhead, type.numeric, { color: dark.faint, width: 20, textAlign: 'center', fontWeight: '600' }]}>{i + 2}</Text>
                    <Cover cover={t.cover} size={44} radius={8} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.callout, { color: colors.white, fontWeight: '500' }]} numberOfLines={1}>{t.title}</Text>
                      <Text style={[type.footnote, { color: dark.sub }]} numberOfLines={1}>{t.artist ? `${t.artist} · ` : ''}{by(q.suggestedByUserId)}</Text>
                    </View>
                    <VoteChip votes={q.votes} voted={q.callerVoted} label={`${t.title} için oy ver`} onPress={() => room.toggleVote(q)} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
          {upNext.length > 0 && <Text style={[type.caption, { color: dark.faint, textAlign: 'center', marginTop: 12 }]}>{room.isMine ? 'Hemen çalmak ya da kaldırmak için basılı tut' : 'Seçenekler için basılı tut'}</Text>}

        </ScrollView>

        {/* floating add bar */}
        <BottomFade height={130} />
        <SafeAreaView edges={['bottom']} style={{ position: 'absolute', left: 20, right: 20, bottom: 8 }}>
          <Pill title="Şarkı ekle" variant="light" height={56} left={<Icon name="plus" size={18} color={colors.black} strokeWidth={2.4} />}
            onPress={() => router.push({ pathname: '/party/suggest', params: { id } })} />
        </SafeAreaView>
      </SafeAreaView>

      <CodeSheet mode="enter" visible={!!room.codePrompt} onDone={(c) => room.codePrompt?.(c)} />
      <CodeSheet mode="show" visible={!!shownCode} code={shownCode ?? ''} partyName={ev.name} onDone={() => setShownCode(null)} />
    </View>
  );
}

/**
 * Venue code, both sides. "enter": a guest types the code the host shows (asked on each vote — a code
 * works once per account). "show": the host reads out / shares a fresh code, valid for 15 minutes.
 */
function CodeSheet({ mode, visible, code = '', partyName = '', onDone }: { mode: 'enter' | 'show'; visible: boolean; code?: string; partyName?: string; onDone: (code: string | null) => void }) {
  const [typed, setTyped] = useState('');
  const close = (v: string | null) => { setTyped(''); onDone(v); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
        <View style={{ borderRadius: 24, backgroundColor: '#1C1C1E', padding: 22, gap: 14 }}>
          <Text style={[type.title2, { color: colors.white }]}>{mode === 'enter' ? 'Mekân kodu' : 'Mekân kodun'}</Text>
          {mode === 'enter' ? (
            <>
              <Text style={[type.subhead, { color: dark.sub, lineHeight: 20 }]}>Bu partide oy vermek için ev sahibinin gösterdiği kodu gir. Her oy için yeni bir kod gerekir.</Text>
              <TextInput value={typed} onChangeText={(t) => setTyped(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} autoFocus autoCapitalize="characters" autoCorrect={false}
                placeholder="ABCD2345" placeholderTextColor={dark.faint} selectionColor={colors.white} onSubmitEditing={() => typed.length >= 4 && close(typed)}
                maxFontSizeMultiplier={1.3} style={[field, type.numeric, { fontSize: 30, fontWeight: '700', letterSpacing: 6, color: colors.white, textAlign: 'center', minHeight: 64, borderRadius: 14, backgroundColor: dark.card }]} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <DarkButton title="Vazgeç" height={48} style={{ flex: 1 }} onPress={() => close(null)} />
                <Pill title="Oy ver" variant="light" height={48} style={{ flex: 1 }} disabled={typed.length < 4} onPress={() => close(typed)} />
              </View>
            </>
          ) : (
            <>
              <Text style={[type.subhead, { color: dark.sub, lineHeight: 20 }]}>Yerindeki misafirlere göster. 15 dakika geçerli; her kişi her kodu bir kez kullanabilir.</Text>
              <Text selectable style={[type.numeric, { fontSize: 40, fontWeight: '800', letterSpacing: 8, color: colors.white, textAlign: 'center', marginVertical: 6 }]}>{code}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <DarkButton title="Paylaş" height={48} style={{ flex: 1 }} onPress={() => Share.share({ message: `${partyName} mekân kodu: ${code} (15 dk geçerli)` })} />
                <Pill title="Tamam" variant="light" height={48} style={{ flex: 1 }} onPress={() => close(null)} />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
