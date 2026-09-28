import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Track, tracks } from '@/data/mock';

type Player = {
  track: Track;
  playing: boolean;
  position: number; // seconds
  queue: Track[];
  toggle: () => void;
  next: () => void;
  prev: () => void;
  play: (id: string) => void;
};

const order = ['night', 'moons', 'summer', 'laundry', 'floppy', 'slowmo', 'dialup'];
const Ctx = createContext<Player | null>(null);

/** Local mock player. Replace with the real audio + socket-driven room state later. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [position, setPosition] = useState(102);
  const track = tracks[order[index]];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPosition((p) => {
        if (p + 1 >= track.duration) {
          setIndex((i) => (i + 1) % order.length);
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing, track.duration]);

  const value = useMemo<Player>(() => ({
    track,
    playing,
    position,
    queue: order.slice(index + 1).concat(order.slice(0, index)).map((id) => tracks[id]),
    toggle: () => setPlaying((p) => !p),
    next: () => { setIndex((i) => (i + 1) % order.length); setPosition(0); },
    prev: () => { setIndex((i) => (i - 1 + order.length) % order.length); setPosition(0); },
    play: (id) => { const i = order.indexOf(id); if (i >= 0) { setIndex(i); setPosition(0); setPlaying(true); } },
  }), [track, playing, position, index]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return v;
}
