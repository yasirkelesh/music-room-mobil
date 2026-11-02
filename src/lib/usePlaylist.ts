import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';
import { realtime, PlaylistEvent } from '@/api/realtime';
import type { Collaborator, Playlist, PlaylistTrack } from '@/api/types';

export type LogEntry = { id: number; at: number; text: string; videoId?: string };

/**
 * One playlist, live. Reads are REST; every write carries the ETag of the last read (If-Match) and
 * a stale one comes back 412, which means somebody else wrote first — we re-read and say so.
 * The playlist hub only says "something changed", so every event ends in a re-read.
 */
export function usePlaylist(id: string) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const etag = useRef<string | null>(null);
  const tracksRef = useRef<PlaylistTrack[]>([]);
  const writing = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const [pl, tr] = await Promise.all([api.playlists.get(id), api.playlists.allTracks(id)]);
      if (mine !== seq.current) return;
      setPlaylist(pl.data);
      tracksRef.current = tr.tracks;
      setTracks(tr.tracks);
      etag.current = tr.etag;
      setError(null);
    } catch (e) {
      if (mine === seq.current) setError(e);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [id]);

  const loadCollaborators = useCallback(async () => {
    try { setCollaborators(await api.playlists.collaborators(id)); } catch { /* shown as empty */ }
  }, [id]);

  const push = useCallback((text: string, videoId?: string) => {
    setLog((l) => [{ id: Date.now() + Math.random(), at: Date.now(), text, videoId }, ...l].slice(0, 20));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { reload(); loadCollaborators(); }, 0);
    return () => clearTimeout(t);
  }, [reload, loadCollaborators]);

  // Live updates. Echoes of our own writes are swallowed while a write is in flight; the re-read covers them.
  useEffect(() => {
    let sub: { close: () => void } | null = null;
    let closed = false;
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(reload, 150);
    };
    const onEvent = (e: PlaylistEvent) => {
      if (writing.current === 0) {
        const known = (tid: string) => tracksRef.current.find((t) => t.playlistTrackId === tid)?.youtubeVideoId;
        if (e.kind === 'TrackAdded') push('eklendi', e.youtubeVideoId);
        else if (e.kind === 'TrackMoved') push('taşındı', known(e.playlistTrackId));
        else if (e.kind === 'TrackRemoved') push('çıkarıldı', known(e.playlistTrackId));
        else { push(e.removed ? 'Bir düzenleyici çıkarıldı' : 'Yeni bir düzenleyici eklendi'); loadCollaborators(); }
      }
      refresh();
    };
    realtime.playlist(id, onEvent, refresh)
      .then((s) => { if (closed) s.close(); else sub = s; })
      .catch(() => { /* offline: pull-to-refresh and the next write still work over REST */ });
    return () => { closed = true; sub?.close(); if (timer.current) clearTimeout(timer.current); };
  }, [id, reload, push, loadCollaborators]);

  /** Runs a guarded write, then re-reads. Returns false when the write was refused. */
  const write = useCallback(async (fn: (etag: string) => Promise<unknown>, done?: string): Promise<boolean> => {
    writing.current++;
    try {
      if (!etag.current) throw new ApiError(412, null);
      await fn(etag.current);
      if (done) push(done);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 412) setNotice('Listeyi başka biri az önce değiştirdi. Güncelledim, tekrar dene.');
      else if (e instanceof ApiError && e.status === 409) setNotice('Liste dolu ya da bu işlem çakışıyor.');
      else if (e instanceof ApiError && e.status === 404) setNotice('Bu listeyi düzenleme iznin yok.');
      else setNotice(e instanceof ApiError && e.network ? 'Sunucuya ulaşılamıyor.' : 'İşlem tamamlanamadı.');
      return false;
    } finally {
      await reload();
      writing.current--;
    }
  }, [push, reload]);

  const move = (trackId: string, dest: { afterTrackId: string } | { beforeTrackId: string }) =>
    write((tag) => api.playlists.moveTrack(id, trackId, dest, tag));
  const remove = (trackId: string) => write((tag) => api.playlists.removeTrack(id, trackId, tag));
  const add = (youtubeVideoId: string) => write((tag) => api.playlists.addTrack(id, { youtubeVideoId }, tag));

  return { playlist, tracks, collaborators, log, notice, setNotice, error, loading, reload, move, remove, add, setTracks };
}
