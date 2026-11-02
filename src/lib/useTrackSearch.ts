import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { describeError } from '@/api/errors';
import { rememberTracks, trackFromMeta } from '@/lib/tracks';
import type { Track } from '@/data/mock';

const MIN = 2; // QUERY.TOO_SHORT below this

type State = { term: string; results: Track[]; error: string | null };

/** Debounced catalog search. The route is rate limited per account, so we wait for the user to pause. */
export function useTrackSearch(q: string, pageSize = 10) {
  const term = q.trim();
  const [state, setState] = useState<State>({ term: '', results: [], error: null });

  useEffect(() => {
    if (term.length < MIN) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const r = await api.tracks.search(term, { pageSize });
        if (!live) return;
        rememberTracks(r);
        setState({ term, results: r.map(trackFromMeta), error: null });
      } catch (e) {
        if (live) setState({ term, results: [], error: describeError(e) });
      }
    }, 500);
    return () => { live = false; clearTimeout(t); };
  }, [term, pageSize]);

  const active = term.length >= MIN;
  const settled = state.term === term;
  return {
    results: active && settled ? state.results : [],
    loading: active && !settled,
    error: active && settled ? state.error : null,
  };
}
