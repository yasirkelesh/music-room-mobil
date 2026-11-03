import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { ControlEvent, EventHubEvent, NowPlayingEvent, PositionEvent, realtime } from '@/api/realtime';
import { EventDetail, Geofence, LicenceMode, PlaybackSession, PlaybackSourceType, QueueEntry, Uuid, VotePresence } from '@/api/types';
import { ensureDevice } from '@/lib/device';
import { useTracks } from '@/lib/tracks';
import { peekBackground, takeBackground } from '@/state/partyBackground';
import { useAuth } from '@/state/auth';
import { usePlayer } from '@/state/player';

/** The playback session a party is running, as far as this client knows it. */
export type RoomSession = { sessionId: Uuid; deviceId: Uuid | null; nowPlayingId: Uuid | null };

const PAGE = 50;

/**
 * Where a guest is relative to the playing device. 'here': same room, the host's speaker is enough and
 * this phone stays quiet. 'away': somewhere else, so this phone plays the same song in step.
 */
export type Place = 'here' | 'away';
/** Remembered per party for as long as the app runs, so re-opening the room does not ask again. */
const places = new Map<string, Place>();

/** A known playhead: `ms` into item `id` at local wall-clock `at` (ms), frozen while `paused`. */
type Anchor = { id: Uuid | null; ms: number; at: number; paused: boolean };

/**
 * Server clock minus this phone's, in ms. Every session read carries `serverNowUtc`; the server's
 * timestamps are turned into this phone's time with it, so a phone whose clock runs a few seconds off
 * still lands on the host's second.
 */
let skew = 0;
function learnClock(d: Pick<PlaybackSession, 'serverNowUtc'>) {
  if (d.serverNowUtc) skew = +new Date(d.serverNowUtc) - Date.now();
}
const localTime = (serverIso: string) => +new Date(serverIso) - skew;

function anchorOf(d: Pick<PlaybackSession, 'nowPlayingId' | 'positionMs' | 'positionAtUtc' | 'paused' | 'nowPlayingStartedAtUtc'>): Anchor | null {
  if (d.positionMs != null && d.positionAtUtc) return { id: d.nowPlayingId, ms: d.positionMs, at: localTime(d.positionAtUtc), paused: !!d.paused };
  if (d.nowPlayingStartedAtUtc) return { id: d.nowPlayingId, ms: 0, at: localTime(d.nowPlayingStartedAtUtc), paused: false };
  return null;
}
/** Where the playing device should be now, in seconds. */
const expectedAt = (a: Anchor) => Math.max(0, (a.paused ? a.ms : a.ms + Date.now() - a.at) / 1000);
/** Guests further off than this are moved; closer is left alone (a seek is an audible skip). */
const DRIFT = 2.5;
const HEARTBEAT = 15000;

/** Metres between two points (haversine). */
function metres(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Inside the venue? null when the location cannot be had (no permission, no fix). */
async function atVenue(venue: Geofence): Promise<boolean | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    // a fuzzy fix near the edge counts as inside: a phone wrongly playing in the room is the worse mistake
    return metres(pos.coords, venue) <= venue.radiusMetres + Math.min(pos.coords.accuracy ?? 0, 100);
  } catch {
    return null;
  }
}

/**
 * One party, live. Reads are REST; the event hub only says that something changed, so most events end
 * in a re-read. What plays is decided by the server's playback session: this phone plays audio only when
 * the session runs on *this* device, and then asks the server for the next track when one ends.
 */
export function useRoom(eventId: string) {
  const { userId } = useAuth();
  const player = usePlayer();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  // a party left playing in the background starts out as this screen's session, on this device
  const [session, setSession] = useState<RoomSession | null>(() => {
    const b = peekBackground(eventId);
    return b ? { sessionId: b.sessionId, deviceId: b.deviceId, nowPlayingId: b.nowPlayingId } : null;
  });
  const [myDeviceId, setMyDeviceId] = useState<Uuid | null>(() => peekBackground(eventId)?.deviceId ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef<RoomSession | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const played = useRef<string | null>(null);
  const anchor = useRef<Anchor | null>(null);
  const followed = useRef<string | null>(null);
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; });

  const [place, setPlaceState] = useState<Place | null>(() => places.get(eventId) ?? null);
  /** True while the screen should ask "are you with the host?" (no venue, or location unavailable). */
  const [placeAsk, setPlaceAsk] = useState(false);
  const setPlace = useCallback((p: Place) => { places.set(eventId, p); setPlaceState(p); setPlaceAsk(false); }, [eventId]);

  useEffect(() => { sessionRef.current = session; }, [session]);

  const loadQueue = useCallback(async () => {
    const out: QueueEntry[] = [];
    for (let page = 1; page <= 10; page++) {
      const r = await api.events.queue(eventId, { page, pageSize: PAGE });
      out.push(...r);
      if (r.length < PAGE) break;
    }
    return out;
  }, [eventId]);

  /** Finds a live session of this event on one of the caller's own devices (the only place one can be read from). */
  const findOwnSession = useCallback(async (): Promise<RoomSession | null> => {
    const devices = await api.devices.list();
    for (const d of devices) {
      try {
        const r = await api.devices.playbackSession(d.deviceId);
        if (r.data.sourceId === eventId && !r.data.endedAtUtc) {
          return { sessionId: r.data.sessionId, deviceId: r.data.deviceId, nowPlayingId: r.data.nowPlayingId };
        }
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e;
      }
    }
    return null;
  }, [eventId]);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const [ev, q] = await Promise.all([api.events.get(eventId), loadQueue()]);
      if (mine !== seq.current) return;
      setEvent(ev.data);
      setQueue(q);
      setError(null);
    } catch (e) {
      if (mine === seq.current) setError(e);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [eventId, loadQueue]);

  const refreshQueueSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { loadQueue().then(setQueue).catch(() => {}); }, 200);
  }, [loadQueue]);

  /* ---- initial load, roster, own session ---- */
  useEffect(() => {
    // Re-opening a party that kept playing in the background: this screen drives it again.
    takeBackground(eventId);
    const t = setTimeout(async () => {
      reload();
      try { setMyDeviceId(await ensureDevice()); } catch { /* shown when the user tries to play */ }
      try {
        const s = await findOwnSession();
        if (s) setSession(s);
        else {
          // A guest's way in: whatever the party plays, on whoever's device (404: nothing, or an older API).
          const r = await api.events.playbackSession(eventId);
          learnClock(r.data);
          if (!r.data.endedAtUtc) {
            anchor.current = anchorOf(r.data);
            setSession({ sessionId: r.data.sessionId, deviceId: r.data.deviceId, nowPlayingId: r.data.nowPlayingId });
          }
        }
      } catch { /* none */ }
      // The roster is a courtesy ("I'm here"), never a precondition; 409 means already on it.
      api.events.join(eventId).catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, [eventId, reload, findOwnSession]);

  /* ---- live updates ---- */
  useEffect(() => {
    let sub: { close: () => void } | null = null;
    let closed = false;
    const onEvent = (e: EventHubEvent) => {
      if (e.kind === 'VoteChanged') {
        setQueue((q) => q.map((x) => (x.suggestionId === e.suggestionId ? { ...x, votes: e.votes } : x)));
      }
      refreshQueueSoon();
    };
    const onNowPlaying = (e: NowPlayingEvent) => {
      anchor.current = anchorOf(e) ?? { id: e.nowPlayingId, ms: 0, at: Date.now(), paused: false };
      setSession((s) => ({ sessionId: e.sessionId, deviceId: s && s.sessionId === e.sessionId ? s.deviceId : null, nowPlayingId: e.nowPlayingId }));
    };
    const onPosition = (e: PositionEvent) => {
      const s = sessionRef.current;
      if (s && s.sessionId !== e.sessionId) return;
      const a = anchorOf(e);
      if (!a) return;
      anchor.current = a;
      // a follower moves with the host: pause, resume, and seek when it has drifted
      const p = playerRef.current;
      if (!followed.current || !p.controlled || a.id !== s?.nowPlayingId) return;
      if (a.paused) { if (p.playing) p.pause(); }
      else if (!p.playing) { p.resume(); p.seek(expectedAt(a)); }
      if (!a.paused && Math.abs(p.getPosition() - expectedAt(a)) > DRIFT) p.seek(expectedAt(a));
    };
    realtime.event(eventId, onEvent, onNowPlaying, () => { reload(); }, onPosition)
      .then((s) => { if (closed) s.close(); else sub = s; })
      .catch(() => { /* offline: pulling and the next write still work over REST */ });
    return () => { closed = true; sub?.close(); if (timer.current) clearTimeout(timer.current); };
  }, [eventId, reload, refreshQueueSoon]);

  /* ---- playing on this device ---- */
  const advance = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      for (let attempt = 0; ; attempt++) {
        const cur = await api.playback.get(s.sessionId);
        try {
          const r = await api.playback.advance(s.sessionId, cur.data.nowPlayingId, cur.etag ?? undefined);
          setSession((prev) => (prev && prev.sessionId === s.sessionId ? { ...prev, nowPlayingId: r.nowPlayingId } : prev));
          return;
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 412 && attempt === 0)) throw e;
        }
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Nothing left to play: the server ended the session.
        setSession(null);
        player.stop();
        setNotice('Sıra bitti. Birisi şarkı önerince tekrar başlatabilirsin.');
      } else {
        setNotice(describeError(e));
      }
    }
  }, [player]);

  const isMine = !!session?.deviceId && session.deviceId === myDeviceId;

  /* ---- control delegation (V.2.2): devices friends handed to this account ---- */
  const [granted, setGranted] = useState<Set<Uuid>>(new Set());
  useEffect(() => {
    let sub: { close: () => void } | null = null;
    let closed = false;
    const load = () => { api.me.controlGrants().then((g) => { if (!closed) setGranted(new Set(g.map((x) => x.deviceId))); }).catch(() => {}); };
    load();
    // a grant or a take-back made on another phone arrives on the per-account hub
    realtime.control((_e: ControlEvent) => load(), load).then((s) => { if (closed) s.close(); else sub = s; }).catch(() => {});
    return () => { closed = true; sub?.close(); };
  }, []);
  // A session learned from the hub does not say which device plays it; ask, so delegation can be matched.
  useEffect(() => {
    if (!session || session.deviceId) return;
    const id = session.sessionId;
    api.playback.get(id)
      .then((r) => { learnClock(r.data); if (!anchor.current || anchor.current.id !== r.data.nowPlayingId) anchor.current = anchorOf(r.data) ?? anchor.current; return r; })
      .then((r) => setSession((prev) => (prev && prev.sessionId === id && !prev.deviceId ? { ...prev, deviceId: r.data.deviceId } : prev)))
      .catch(() => {});
  }, [session?.sessionId, session?.deviceId]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Somebody handed this account the control of the device playing the party: skip and pick, not stop. */
  const isController = !isMine && !!session?.deviceId && granted.has(session.deviceId);
  const nowEntry = queue.find((q) => q.suggestionId === session?.nowPlayingId) ?? null;
  const nowTrack = useTracks(nowEntry ? [nowEntry.youtubeVideoId] : [])[nowEntry?.youtubeVideoId ?? ''];

  // Start (or switch) audio when this device's session moves to a new item.
  useEffect(() => {
    if (!isMine || !session) return;
    if (session.nowPlayingId === null) { player.stop(); played.current = null; return; }
    const key = `${session.sessionId}:${session.nowPlayingId}`;
    if (!nowEntry) return;
    // Already on (handed back from the background, or the screen re-mounted): take over, do not restart.
    if (player.controlled && player.track?.id === nowEntry.youtubeVideoId) {
      played.current = key;
      player.setController({ ended: advance, next: advance });
      return;
    }
    if (played.current === key) return;
    played.current = key;
    player.playControlled(nowTrack, event?.name ?? 'Parti', { ended: advance, next: advance });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMine, session?.sessionId, session?.nowPlayingId, nowEntry?.suggestionId]);

  // Titles arrive after the audio starts; refresh the display without restarting it.
  useEffect(() => {
    if (isMine && player.controlled && nowTrack && nowTrack.title !== '…') player.refreshTrack(nowTrack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTrack?.title, nowTrack?.id]);

  // The speaker moved to another device (or the session ended elsewhere): this one goes quiet.
  const wasMine = useRef(false);
  useEffect(() => {
    const p = playerRef.current;
    if (wasMine.current && !isMine && p.controlled && !followed.current) { p.stop(); played.current = null; }
    wasMine.current = isMine;
  }, [isMine]);

  /* ---- guests: where are you, and play along when away ---- */
  const venue = event?.geofence ?? null;
  useEffect(() => {
    if (isMine || place || !session || !event) return;
    let gone = false;
    (async () => {
      const inside = venue ? await atVenue(venue) : null;
      if (gone) return;
      if (inside === null) setPlaceAsk(true); else setPlace(inside ? 'here' : 'away');
    })();
    return () => { gone = true; };
  }, [isMine, place, !!session, !!event, venue, setPlace]); // eslint-disable-line react-hooks/exhaustive-deps

  const following = !isMine && place === 'away' && !!session?.nowPlayingId;
  useEffect(() => {
    const p = playerRef.current;
    if (!following || !session || !nowEntry) {
      if (followed.current) {
        followed.current = null;
        // became the party's speaker: the player is ours now, leave it playing
        if (!isMine && p.controlled) p.stop();
      }
      return;
    }
    const key = `${session.sessionId}:${session.nowPlayingId}`;
    if (followed.current === key) return;
    followed.current = key;
    const a = anchor.current?.id === session.nowPlayingId ? anchor.current : null;
    // The host picks what comes next; at the end of the song this phone waits for the server to say.
    p.playControlled(nowTrack, event?.name ?? 'Parti', { ended: () => {} }, a ? expectedAt(a) : 0);
    if (a?.paused) setTimeout(() => playerRef.current.pause(), 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following, session?.sessionId, session?.nowPlayingId, nowEntry?.suggestionId]);

  // A follower with nobody to follow (screen closed) stops, instead of playing one stale song.
  useEffect(() => () => {
    if (followed.current && playerRef.current.controlled) playerRef.current.stop();
    followed.current = null;
  }, []);

  /* ---- the playing device: tell the guests where the playhead is ---- */
  const reporting = useRef(true);
  const report = useCallback(() => {
    const s = sessionRef.current;
    const p = playerRef.current;
    if (!s || !s.nowPlayingId || !reporting.current || !p.controlled || p.buffering) return;
    api.playback.reportPosition(s.sessionId, { nowPlayingId: s.nowPlayingId, positionMs: Math.round(p.getPosition() * 1000), paused: !p.playing })
      .catch((e) => {
        // an API without the endpoint: stop asking for as long as this room is open
        if (e instanceof ApiError && (e.status === 404 || e.status === 405)) reporting.current = false;
      });
  }, []);
  useEffect(() => {
    if (!isMine || !player.controlled || player.buffering) return;
    report();
    if (!player.playing) return;
    const t = setInterval(report, HEARTBEAT);
    return () => clearInterval(t);
  }, [isMine, player.controlled, player.playing, player.buffering, player.seekTick, session?.nowPlayingId, report]);

  /**
   * A party plays on one device. Moving it here from another device ends the session there first; only
   * that device's owner may end it, so moving the speaker off somebody else's phone is refused (it would
   * leave two phones playing the same party).
   */
  const releaseOther = useCallback(async (deviceId: Uuid): Promise<boolean> => {
    const other = sessionRef.current;
    if (!other || other.deviceId === deviceId) return true;
    try {
      const cur = await api.playback.get(other.sessionId);
      if (cur.data.endedAtUtc || cur.data.deviceId === deviceId) return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return true; // gone
      throw e;
    }
    try {
      await api.playback.stop(other.sessionId);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotice('Parti şu an başka birinin cihazında çalıyor. Hoparlörü taşımak için önce o cihazda çalmayı durdurması gerekiyor.');
        return false;
      }
      throw e;
    }
  }, []);

  const startPlaying = useCallback(async () => {
    setNotice(null);
    try {
      const deviceId = await ensureDevice();
      setMyDeviceId(deviceId);
      if (!(await releaseOther(deviceId))) return;
      takeBackground(); // another party kept playing in the background: this one replaces it
      let started: { sessionId: Uuid; nowPlayingId: Uuid | null };
      try {
        started = await api.playback.start({ deviceId, sourceType: PlaybackSourceType.Event, sourceId: eventId });
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 409)) throw e;
        // The device already plays something. Adopt it if it is this party, otherwise stop it first.
        const cur = await api.devices.playbackSession(deviceId);
        if (cur.data.sourceId !== eventId) {
          await api.playback.stop(cur.data.sessionId);
          started = await api.playback.start({ deviceId, sourceType: PlaybackSourceType.Event, sourceId: eventId });
        } else {
          started = { sessionId: cur.data.sessionId, nowPlayingId: cur.data.nowPlayingId };
        }
      }
      played.current = null;
      setSession({ sessionId: started.sessionId, deviceId, nowPlayingId: started.nowPlayingId });
      if (started.nowPlayingId === null) setNotice('Sırada şarkı yok. Önce bir şarkı öner.');
    } catch (e) {
      setNotice(e instanceof ApiError && e.status === 404 ? 'Bu partide çalma izni yok.' : describeError(e));
    }
  }, [eventId, releaseOther]);

  const stopPlaying = useCallback(async () => {
    const s = sessionRef.current;
    player.stop();
    played.current = null;
    setSession(null);
    if (s && s.deviceId === myDeviceId) await api.playback.stop(s.sessionId).catch(() => {});
  }, [player, myDeviceId]);

  /* ---- queue actions ---- */
  const coordinates = useCallback(async () => {
    // Compared server-side against the venue and dropped; never stored.
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') throw new Error('location-denied');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }, []);

  /**
   * The screen shows a code sheet while this is set; calling it with the typed code (or null to cancel)
   * resolves the vote that asked. A venue code is spent once per account, so each vote asks for one.
   */
  const [codePrompt, setCodePrompt] = useState<((code: string | null) => void) | null>(null);
  const askCode = useCallback(() => new Promise<string | null>((resolve) => {
    setCodePrompt(() => (code: string | null) => { setCodePrompt(null); resolve(code ? code.trim().toUpperCase() : null); });
  }), []);

  const licence = event?.licence;

  /**
   * A LocationAndTimeRestricted event wants evidence. The event response does not say which proof it
   * asks for, so: with a venue on record we try coordinates first and ask for the code only if that is
   * refused (code-only or both); without a venue it can only be the code.
   */
  const castVote = useCallback(async (suggestionId: Uuid) => {
    if (licence !== LicenceMode.LocationAndTimeRestricted) { await api.events.vote(eventId, suggestionId); return; }
    const presence: VotePresence = {};
    if (venue) {
      presence.coordinates = await coordinates();
      try { await api.events.vote(eventId, suggestionId, presence); return; } catch (e) {
        if (!(e instanceof ApiError && e.status === 422)) throw e;
      }
    }
    const code = await askCode();
    if (!code) throw new Error('cancelled');
    try {
      await api.events.vote(eventId, suggestionId, { ...presence, eventCode: code });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) throw new Error('code-refused');
      throw e;
    }
  }, [eventId, licence, venue, coordinates, askCode]);

  const toggleVote = useCallback(async (entry: QueueEntry) => {
    setNotice(null);
    const flip = (voted: boolean) => setQueue((q) => q
      .map((x) => (x.suggestionId === entry.suggestionId ? { ...x, callerVoted: voted, votes: x.votes + (voted ? 1 : -1) } : x))
      .sort((a, b) => b.votes - a.votes));
    flip(!entry.callerVoted);
    try {
      if (entry.callerVoted) await api.events.unvote(eventId, entry.suggestionId);
      else await castVote(entry.suggestionId);
    } catch (e) {
      flip(entry.callerVoted); // undo
      const m = e instanceof Error ? e.message : '';
      if (m === 'cancelled') return;
      setNotice(
        m === 'location-denied' ? 'Oy vermek için konum iznine ihtiyaç var.'
          : m === 'code-refused' ? 'Kod kabul edilmedi: yanlış, süresi dolmuş ya da bu kodu zaten kullandın. Ev sahibinden yeni kod iste.'
            : e instanceof ApiError && e.status === 422 ? (venue ? 'Oy vermek için partinin yerinde olman gerekiyor.' : 'Bu partide oy vermek için mekân kodu gerekiyor.')
              : e instanceof ApiError && e.status === 404 ? 'Bu partide oy verme iznin yok.'
                : describeError(e),
      );
    }
  }, [eventId, castVote, venue]);

  /** The owner's side of the venue code: a fresh code, valid for `ttlSeconds` (60–3600, default 900). */
  const issueCode = useCallback(async (ttlSeconds = 900) => (await api.events.issueCode(eventId, ttlSeconds)).code, [eventId]);

  /** Jump the session to a named item of the queue (the controller's choice, instead of the votes'). */
  const jumpTo = useCallback(async (suggestionId: Uuid) => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      for (let attempt = 0; ; attempt++) {
        const cur = await api.playback.get(s.sessionId);
        try {
          await api.playback.jump(s.sessionId, suggestionId, cur.etag ?? '');
          setSession((prev) => (prev && prev.sessionId === s.sessionId ? { ...prev, nowPlayingId: suggestionId } : prev));
          return;
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 412 && attempt === 0)) throw e;
        }
      }
    } catch (e) {
      setNotice(describeError(e));
    }
  }, []);

  /** Leave the roster ("I'm here"). Playing on this device stops too. */
  const leave = useCallback(async () => {
    if (sessionRef.current?.deviceId === myDeviceId) await stopPlaying();
    await api.events.leave(eventId).catch(() => {}); // 404: not on the roster — same end state
  }, [eventId, myDeviceId, stopPlaying]);

  const suggest = useCallback(async (videoId: string): Promise<boolean> => {
    setNotice(null);
    try {
      await api.events.suggest(eventId, videoId);
      refreshQueueSoon();
      return true;
    } catch (e) {
      setNotice(e instanceof ApiError && e.status === 409 ? 'Bu şarkı zaten sırada.' : e instanceof ApiError && e.status === 404 ? 'Bu partiye şarkı öneremezsin.' : describeError(e));
      return false;
    }
  }, [eventId, refreshQueueSoon]);

  const removeSuggestion = useCallback(async (suggestionId: Uuid) => {
    try { await api.events.removeSuggestion(eventId, suggestionId); setQueue((q) => q.filter((x) => x.suggestionId !== suggestionId)); }
    catch (e) { setNotice(describeError(e)); }
  }, [eventId]);

  const isOwner = !!userId && event?.ownerId === userId;

  return {
    event, queue, session, nowEntry, nowTrack, isMine, isController, isOwner, userId,
    place, placeAsk, setPlace, following,
    notice, setNotice, error, loading,
    reload, startPlaying, stopPlaying, advance, toggleVote, suggest, removeSuggestion,
    codePrompt, issueCode, jumpTo, leave,
  };
}
