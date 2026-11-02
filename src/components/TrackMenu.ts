import { router } from 'expo-router';
import { formatTime, Track } from '@/data/mock';
import { Action, showActions } from './ActionSheet';

/** Where a record can go: one of your cabinets, or a party's queue. Search rows and the player use it. */
export function showTrackMenu(t: Track, opts?: { play?: () => void }) {
  const actions: Action[] = [];
  if (opts?.play) actions.push({ label: 'Çal', icon: 'play', run: opts.play });
  actions.push({ label: 'Bir dolaba ekle', icon: 'lists', hint: 'Plak dolaplarından birinin rafına koy', run: () => router.push({ pathname: '/list/pick', params: { videoId: t.id } }) });
  actions.push({ label: 'Partiye öner', icon: 'jam', hint: 'Katıldığın bir partinin sırasına öner', run: () => router.push({ pathname: '/party/pick', params: { videoId: t.id } }) });
  showActions({ title: t.title, subtitle: t.duration ? `${t.artist} · ${formatTime(t.duration)}` : t.artist, cover: t.cover }, actions);
}
