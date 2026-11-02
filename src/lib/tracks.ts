import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { TrackMetadata } from '@/api/types';
import { CoverArt, covers, CoverKey, Track } from '@/data/mock';

/** YouTube serves a thumbnail for any video id without an API call (the catalog route is rate limited). */
export const thumbnail = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

export const trackFromMeta = (m: TrackMetadata): Track => ({
  id: m.youtubeVideoId,
  title: m.title,
  artist: m.channel,
  cover: { uri: m.thumbnailUrl || thumbnail(m.youtubeVideoId) },
  duration: m.durationSeconds,
});

/** What to show until the catalog answers (or when it cannot). */
export const placeholderTrack = (videoId: string): Track => ({
  id: videoId, title: '…', artist: '', cover: { uri: thumbnail(videoId) }, duration: 0,
});

const keys = Object.keys(covers) as CoverKey[];

/**
 * Colours for a track. A stand-in cover carries its own; a real thumbnail gets one of the design's
 * palettes picked by hash, so a track keeps the same colours everywhere (no image colour extraction yet).
 */
export function paletteOf(t: Pick<Track, 'id' | 'cover'>): CoverArt {
  if (typeof t.cover === 'string') return covers[t.cover];
  let h = 0;
  for (const c of t.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return covers[keys[h % keys.length]];
}

/* ---------- metadata cache ---------- */

const cache = new Map<string, Track>();
/** Ids the catalog could not answer for (404 / 503), with when — retried after a minute, shown by id meanwhile. */
const failed = new Map<string, number>();
const RETRY_MS = 60_000;
const isFailed = (id: string) => (failed.get(id) ?? 0) > Date.now() - RETRY_MS;
const inflight = new Map<string, Promise<Track | null>>();

function fetchTrack(id: string): Promise<Track | null> {
  let p = inflight.get(id);
  if (!p) {
    p = api.tracks.get(id)
      .then((m) => { const t = trackFromMeta(m); cache.set(id, t); return t; })
      .catch(() => { failed.set(id, Date.now()); return null; })
      .finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

/** Resolves titles for a set of video ids, a few at a time, and re-renders as they arrive. */
export function useTracks(videoIds: string[]): Record<string, Track> {
  const [, bump] = useState(0);
  const key = videoIds.join(',');

  useEffect(() => {
    let live = true;
    const todo = [...new Set(videoIds)].filter((id) => !cache.has(id) && !isFailed(id));
    (async () => {
      for (let i = 0; i < todo.length; i += 4) {
        await Promise.all(todo.slice(i, i + 4).map(fetchTrack));
        if (!live) return;
        bump((n) => n + 1);
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return Object.fromEntries(videoIds.map((id) => [
    id,
    cache.get(id) ?? (isFailed(id) ? { ...placeholderTrack(id), title: `YouTube ${id}` } : placeholderTrack(id)),
  ]));
}

/** Seeds the cache with metadata we already hold (search results), so lists show titles at once. */
export function rememberTracks(list: TrackMetadata[]) {
  for (const m of list) cache.set(m.youtubeVideoId, trackFromMeta(m));
}
