import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { keepAlive } from '@/audio/keepAlive';
import { EngineHandle, EngineState, YouTubeEngine } from '@/audio/YouTubeEngine';
import { Track } from '@/data/mock';

/** Who decides what plays next when a server session drives the player. */
export type Controller = { ended: () => void; next?: () => void };

type Player = {
  /** What is loaded (null before anything was played). */
  track: Track | null;
  playing: boolean;
  /** True while YouTube is loading or rebuffering. */
  buffering: boolean;
  /** Name of what we are playing from, e.g. the playlist. */
  label: string | null;
  /** 1-based place in the list, and its length. */
  place: { index: number; total: number } | null;
  /** Tracks after the current one. */
  queue: Track[];
  /** Last playback problem (embedding disabled, unavailable…), cleared on the next play. */
  error: string | null;
  /** Replace the queue and start at `index`. `source` identifies where it came from (e.g. `playlist:<id>`). */
  playList: (tracks: Track[], index?: number, label?: string, source?: string) => void;
  /** What `playList` was last called with as `source`, so a screen can mark "this is playing". */
  source: string | null;
  /**
   * Play one track on behalf of a server playback session (a party). The server picks what comes next:
   * when the track ends, or "next" is pressed, the matching handler asks it instead of the local queue.
   * `at` starts the track that many seconds in (a guest joining a song already playing elsewhere).
   */
  playControlled: (track: Track, label: string, handlers: Controller, at?: number) => void;
  /** True while a server session drives playback (no local queue, no "previous"). */
  controlled: boolean;
  /**
   * Hand the track already playing to another driver (the party screen and its background runner pass
   * it between them) without restarting it. Ignored unless a session drives the player.
   */
  setController: (handlers: Controller) => void;
  /** Swap in fresher metadata (title, artwork) for the track already loaded, without restarting it. */
  refreshTrack: (track: Track) => void;
  toggle: () => void;
  /** Explicit pause / resume, for following someone else's player (toggle would guess). */
  pause: () => void;
  resume: () => void;
  /** Current position in seconds, read on demand (the clock context re-renders twice a second). */
  getPosition: () => number;
  /** Bumped on every seek, so a party host can tell the guests the playhead jumped. */
  seekTick: number;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
};

/** Position changes twice a second; keeping it out of `Player` stops every consumer re-rendering on each tick. */
type Clock = { position: number; duration: number };

const Ctx = createContext<Player | null>(null);
const ClockCtx = createContext<Clock>({ position: 0, duration: 0 });

const errorText = (code: number) =>
  code === 100 ? 'Bu video kaldırılmış ya da gizli.'
    : code === 101 || code === 150 ? 'Video sahibi başka uygulamalarda oynatmayı kapatmış.'
      : code === 153 ? 'YouTube bu uygulamadan oynatmaya izin vermedi.'
        : 'Bu parça çalınamıyor.';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const engine = useRef<EngineHandle>(null);

  // The WebView plays through the app's audio session. Without a playback session iOS mutes it on the
  // silent switch and stops it when the app is backgrounded or the screen locks.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);
  const [list, setList] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState<Clock>({ position: 0, duration: 0 });
  const controller = useRef<Controller | null>(null);
  // What the listener asked for. YouTube pauses itself when the app goes to the background (its page
  // is "hidden"); comparing with this tells that apart from a real pause.
  const wanted = useRef(false);
  const selfResumes = useRef<number[]>([]);
  const [controlled, setControlled] = useState(false);

  // The engine callbacks outlive renders; they read the latest queue through this ref.
  const live = useRef({ list, index });
  const clockRef = useRef<Clock>({ position: 0, duration: 0 });
  useEffect(() => { live.current = { list, index }; clockRef.current = clock; });

  const start = useCallback((i: number, at = 0) => {
    const t = live.current.list[i];
    if (!t) return;
    live.current = { ...live.current, index: i };
    setIndex(i);
    setError(null);
    setBuffering(true);
    setClock({ position: at, duration: t.duration });
    wanted.current = true;
    engine.current?.load(t.id, at);
  }, []);
  const [seekTick, setSeekTick] = useState(0);

  const stop = useCallback(() => {
    controller.current = null;
    setControlled(false);
    wanted.current = false;
    engine.current?.stop();
    setPlaying(false);
    setBuffering(false);
    setClock((c) => ({ ...c, position: 0 }));
  }, []);

  const next = useCallback(() => {
    if (controller.current) { controller.current.next?.(); return; }
    const { list: l, index: i } = live.current;
    if (i + 1 < l.length) start(i + 1); else stop();
  }, [start, stop]);

  const prev = useCallback(() => {
    const { index: i } = live.current;
    if (controller.current || clockRef.current.position > 3 || i === 0) { engine.current?.seek(0); setClock((c) => ({ ...c, position: 0 })); setSeekTick((n) => n + 1); }
    else start(i - 1);
  }, [start]);

  const onState = useCallback((s: EngineState) => {
    if (s === 'paused' && wanted.current && AppState.currentState !== 'active') {
      // paused by YouTube, not by the listener: play on (a few times a minute at most, never a loop)
      const now = Date.now();
      selfResumes.current = selfResumes.current.filter((t) => now - t < 60_000);
      if (selfResumes.current.length < 5) { selfResumes.current.push(now); engine.current?.play(); return; }
    }
    setPlaying(s === 'playing' || s === 'buffering');
    setBuffering(s === 'buffering' || s === 'unstarted');
    if (s === 'ended') { if (controller.current) controller.current.ended(); else next(); }
  }, [next]);

  const onTime = useCallback((position: number, duration: number) => {
    setClock((c) => {
      const d = duration > 0 ? duration : c.duration;
      return Math.abs(c.position - position) < 0.25 && c.duration === d ? c : { position, duration: d };
    });
  }, []);

  const onError = useCallback((code: number) => {
    setError(errorText(code));
    setPlaying(false);
    setBuffering(false);
    // A track that cannot play should not stall the queue.
    if (controller.current) { const c = controller.current; setTimeout(() => c.ended(), 800); return; }
    const { list: l, index: i } = live.current;
    if (i + 1 < l.length) setTimeout(() => start(i + 1), 800);
  }, [start]);

  const playList = useCallback((tracks: Track[], at = 0, name?: string, from?: string) => {
    if (tracks.length === 0) return;
    controller.current = null;
    setControlled(false);
    live.current = { list: tracks, index: at };
    setList(tracks);
    setLabel(name ?? null);
    setSource(from ?? null);
    start(at);
  }, [start]);

  const playControlled = useCallback((track: Track, name: string, handlers: Controller, at = 0) => {
    controller.current = handlers;
    setControlled(true);
    live.current = { list: [track], index: 0 };
    setList([track]);
    setLabel(name);
    setSource(null);
    start(0, at);
  }, [start]);

  const setController = useCallback((handlers: Controller) => {
    if (controller.current) controller.current = handlers;
  }, []);

  const refreshTrack = useCallback((t: Track) => {
    if (live.current.list[live.current.index]?.id !== t.id) return;
    setList((l) => l.map((x, i) => (i === live.current.index ? t : x)));
  }, []);

  const toggle = useCallback(() => {
    if (playing) { wanted.current = false; engine.current?.pause(); setPlaying(false); }
    else if (live.current.list.length) {
      wanted.current = true;
      // After the queue ran out or an error, "play" starts the current track again.
      if (clockRef.current.position === 0 || error) start(live.current.index); else engine.current?.play();
      setPlaying(true);
    }
  }, [playing, error, start]);

  // Lock screen, background survival (see keepAlive). Play/pause from the lock screen comes back here.
  const current = list[index] ?? null;
  useEffect(() => {
    keepAlive(current, playing, (play) => {
      wanted.current = play;
      if (play) engine.current?.play(); else engine.current?.pause();
      setPlaying(play);
    });
  }, [current, playing]);

  const seek = useCallback((s: number) => {
    engine.current?.seek(s);
    setClock((c) => ({ ...c, position: s }));
    setSeekTick((n) => n + 1);
  }, []);

  const pause = useCallback(() => { wanted.current = false; engine.current?.pause(); setPlaying(false); }, []);
  const resume = useCallback(() => {
    if (!live.current.list.length) return;
    wanted.current = true;
    engine.current?.play();
    setPlaying(true);
  }, []);
  const getPosition = useCallback(() => clockRef.current.position, []);

  const value = useMemo<Player>(() => ({
    track: list[index] ?? null,
    playing,
    buffering,
    label,
    place: list.length ? { index: index + 1, total: list.length } : null,
    queue: list.slice(index + 1),
    error,
    playList, playControlled, controlled, setController, refreshTrack, source, toggle, pause, resume, getPosition, seekTick, next, prev, seek, stop,
  }), [list, index, playing, buffering, label, source, error, controlled, playList, playControlled, setController, refreshTrack, toggle, pause, resume, getPosition, seekTick, next, prev, seek, stop]);

  return (
    <Ctx.Provider value={value}>
      <ClockCtx.Provider value={clock}>
        {children}
      </ClockCtx.Provider>
      <YouTubeEngine ref={engine} onState={onState} onTime={onTime} onError={onError} />
    </Ctx.Provider>
  );
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return v;
}

export const usePlayerClock = () => useContext(ClockCtx);
