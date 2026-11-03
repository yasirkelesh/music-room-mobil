// A party that keeps playing after its screen is closed. While the room screen is open, useRoom drives
// the playback session on this device; when the host leaves it and chooses "keep playing", the session
// is handed to this runner, mounted once at the root. It does the minimum the screen did: play what the
// server says is now playing, ask for the next item when a song ends, and tell the guests where the
// playhead is. Opening the room again hands it back (takeBackground).

import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';
import { realtime } from '@/api/realtime';
import type { QueueEntry, Uuid } from '@/api/types';
import { getTrack } from '@/lib/tracks';
import { usePlayer } from '@/state/player';

export type BackgroundParty = { eventId: Uuid; sessionId: Uuid; deviceId: Uuid; nowPlayingId: Uuid | null; name: string };

let current: BackgroundParty | null = null;
const listeners = new Set<(p: BackgroundParty | null) => void>();
const publish = (p: BackgroundParty | null) => { current = p; listeners.forEach((l) => l(p)); };

/** Keep this party playing with no screen open. */
export const continueInBackground = (p: BackgroundParty) => publish(p);

/** What runs in the background for `eventId`, without taking it (a screen's initial state). */
export const peekBackground = (eventId: Uuid): BackgroundParty | null => (current?.eventId === eventId ? current : null);

/**
 * The room screen takes the party back (or another party starts on this device). Returns what was
 * running for `eventId`, if anything; with no id, whatever was running is just let go. Never stops audio.
 */
export function takeBackground(eventId?: Uuid): BackgroundParty | null {
  const p = current;
  if (!p) return null;
  publish(null);
  return !eventId || p.eventId === eventId ? p : null;
}

async function queueEntry(eventId: Uuid, suggestionId: Uuid): Promise<QueueEntry | null> {
  for (let page = 1; page <= 10; page++) {
    const r = await api.events.queue(eventId, { page, pageSize: 50 });
    const hit = r.find((q) => q.suggestionId === suggestionId);
    if (hit) return hit;
    if (r.length < 50) break;
  }
  return null;
}

const HEARTBEAT = 15000;

export function PartyBackground() {
  const player = usePlayer();
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; });
  const [party, setParty] = useState<BackgroundParty | null>(current);
  useEffect(() => { listeners.add(setParty); return () => { listeners.delete(setParty); }; }, []);

  // what this runner last put on, so the hub's echo of our own advance does not restart it
  const playing = useRef<Uuid | null>(null);

  useEffect(() => {
    if (!party) return;
    let gone = false;
    let sub: { close: () => void } | null = null;
    const p = party;
    playing.current = p.nowPlayingId;

    const end = () => {
      if (gone) return;
      takeBackground();
      if (playerRef.current.controlled) playerRef.current.stop();
    };

    const play = async (nowPlayingId: Uuid | null) => {
      if (gone) return;
      if (nowPlayingId === null) { end(); return; } // the queue ran out: the server ended the session
      if (playing.current === nowPlayingId) return;
      playing.current = nowPlayingId;
      try {
        const entry = await queueEntry(p.eventId, nowPlayingId);
        if (!entry || gone) return;
        const track = await getTrack(entry.youtubeVideoId);
        if (gone) return;
        playerRef.current.playControlled(track, p.name, { ended: advance, next: advance });
      } catch { /* the next hub event or advance tries again */ }
    };

    const advance = async () => {
      if (gone) return;
      try {
        for (let attempt = 0; ; attempt++) {
          const cur = await api.playback.get(p.sessionId);
          try {
            const r = await api.playback.advance(p.sessionId, cur.data.nowPlayingId, cur.etag ?? undefined);
            await play(r.nowPlayingId);
            return;
          } catch (e) {
            if (!(e instanceof ApiError && e.status === 412 && attempt === 0)) throw e;
          }
        }
      } catch (e) {
        if (e instanceof ApiError && (e.status === 409 || e.status === 404)) end();
      }
    };

    // The song already playing stays on; from its end on, this runner picks the next one.
    playerRef.current.setController({ ended: advance, next: advance });

    realtime.event(p.eventId, () => {}, (e) => { if (e.sessionId === p.sessionId) play(e.nowPlayingId); }, () => {})
      .then((s) => { if (gone) s.close(); else sub = s; })
      .catch(() => { /* offline: advancing over REST still works */ });

    return () => { gone = true; sub?.close(); };
  }, [party]);

  // Something else took the player (a playlist, the mini player's own stop): the party stops here too,
  // or the guests would see it "playing" with no speaker.
  useEffect(() => {
    if (party && !player.controlled) {
      const p = party;
      takeBackground();
      api.playback.stop(p.sessionId).catch(() => {});
    }
  }, [party, player.controlled]);

  // Guests listening along need the playhead (docs/api/JAM_SYNC.md), as the room screen sends it.
  const reporting = useRef(true);
  useEffect(() => {
    if (!party || !player.controlled || player.buffering || !reporting.current) return;
    const p = party;
    const report = () => {
      const pl = playerRef.current;
      const now = playing.current;
      if (!now) return;
      api.playback.reportPosition(p.sessionId, { nowPlayingId: now, positionMs: Math.round(pl.getPosition() * 1000), paused: !pl.playing })
        .catch((e) => { if (e instanceof ApiError && (e.status === 404 || e.status === 405)) reporting.current = false; });
    };
    report();
    if (!player.playing) return;
    const t = setInterval(report, HEARTBEAT);
    return () => clearInterval(t);
  }, [party, player.controlled, player.playing, player.buffering, player.seekTick]);

  return null;
}
