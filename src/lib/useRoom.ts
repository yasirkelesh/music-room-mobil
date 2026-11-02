import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { EventHubEvent, NowPlayingEvent, realtime } from '@/api/realtime';
import { EventDetail, LicenceMode, PlaybackSourceType, QueueEntry, Uuid, VotePresence } from '@/api/types';
import { ensureDevice } from '@/lib/device';
import { useTracks } from '@/lib/tracks';
import { useAuth } from '@/state/auth';
import { usePlayer } from '@/state/player';

/** The playback session a party is running, as far as this client knows it. */
export type RoomSession = { sessionId: Uuid; deviceId: Uuid | null; nowPlayingId: Uuid | null };

const PAGE = 50;

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
  const [session, setSession] = useState<RoomSession | null>(null);
  const [myDeviceId, setMyDeviceId] = useState<Uuid | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef<RoomSession | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const played = useRef<string | null>(null);

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
    const t = setTimeout(async () => {
      reload();
      try { setMyDeviceId(await ensureDevice()); } catch { /* shown when the user tries to play */ }
      try { const s = await findOwnSession(); if (s) setSession(s); } catch { /* none */ }
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
      setSession((s) => ({ sessionId: e.sessionId, deviceId: s && s.sessionId === e.sessionId ? s.deviceId : null, nowPlayingId: e.nowPlayingId }));
    };
    realtime.event(eventId, onEvent, onNowPlaying, () => { reload(); })
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
  const nowEntry = queue.find((q) => q.suggestionId === session?.nowPlayingId) ?? null;
  const nowTrack = useTracks(nowEntry ? [nowEntry.youtubeVideoId] : [])[nowEntry?.youtubeVideoId ?? ''];

  // Start (or switch) audio when this device's session moves to a new item.
  useEffect(() => {
    if (!isMine || !session) return;
    if (session.nowPlayingId === null) { player.stop(); played.current = null; return; }
    const key = `${session.sessionId}:${session.nowPlayingId}`;
    if (!nowEntry || played.current === key) return;
    played.current = key;
    player.playControlled(nowTrack, event?.name ?? 'Parti', { ended: advance, next: advance });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMine, session?.sessionId, session?.nowPlayingId, nowEntry?.suggestionId]);

  // Titles arrive after the audio starts; refresh the display without restarting it.
  useEffect(() => {
    if (isMine && player.controlled && nowTrack && nowTrack.title !== '…') player.refreshTrack(nowTrack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTrack?.title, nowTrack?.id]);

  const startPlaying = useCallback(async () => {
    setNotice(null);
    try {
      const deviceId = await ensureDevice();
      setMyDeviceId(deviceId);
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
  }, [eventId]);

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
  const venue = event?.geofence ?? null;

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
    event, queue, session, nowEntry, nowTrack, isMine, isOwner, userId,
    notice, setNotice, error, loading,
    reload, startPlaying, stopPlaying, advance, toggleVote, suggest, removeSuggestion,
    codePrompt, issueCode, jumpTo, leave,
  };
}
