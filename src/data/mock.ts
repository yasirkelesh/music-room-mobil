// Mock data used until the NestJS API is wired in (see src/api/client.ts).

export type CoverKey = 'night' | 'moons' | 'summer' | 'laundry' | 'floppy' | 'slowmo' | 'dialup';

export type CoverArt = {
  kind: 'sun' | 'orbs' | 'stripes' | 'grid' | 'split' | 'waves' | 'rings';
  base: string; // dominant colour
  ink: string; // secondary colour, used for small nuances (progress, glow)
  onBase: string; // readable text colour on the dominant colour
};

// Stand-in artwork. In production the real cover image URL from the music
// provider replaces these, and base/ink are extracted from the image.
export const covers: Record<CoverKey, CoverArt> = {
  night: { kind: 'sun', base: '#1E2A4A', ink: '#FF6B57', onBase: '#FFFFFF' },
  moons: { kind: 'orbs', base: '#E9E2D0', ink: '#6F97C8', onBase: '#1C1C1E' },
  summer: { kind: 'stripes', base: '#E9B44C', ink: '#2F5D50', onBase: '#1C1C1E' },
  laundry: { kind: 'grid', base: '#E0457B', ink: '#53D8E8', onBase: '#FFFFFF' },
  floppy: { kind: 'split', base: '#F4D35E', ink: '#0D3B66', onBase: '#1C1C1E' },
  slowmo: { kind: 'waves', base: '#4B2142', ink: '#F29CB3', onBase: '#FFFFFF' },
  dialup: { kind: 'rings', base: '#161616', ink: '#B7E34C', onBase: '#FFFFFF' },
};

export type Track = { id: string; title: string; artist: string; cover: CoverKey; duration: number };

export const tracks: Record<string, Track> = {
  night: { id: 'night', title: 'Night Drive', artist: 'Tape Ghost', cover: 'night', duration: 238 },
  moons: { id: 'moons', title: 'Paper Moons', artist: 'Soft Static', cover: 'moons', duration: 252 },
  summer: { id: 'summer', title: 'Late Summer', artist: 'Tape Ghost', cover: 'summer', duration: 201 },
  laundry: { id: 'laundry', title: 'Neon Laundry', artist: 'The Pagers', cover: 'laundry', duration: 187 },
  floppy: { id: 'floppy', title: 'Floppy Summer', artist: 'Modem Club', cover: 'floppy', duration: 214 },
  slowmo: { id: 'slowmo', title: 'Slow Motion', artist: 'Velvet Arcade', cover: 'slowmo', duration: 245 },
  dialup: { id: 'dialup', title: 'Dial-up Heart', artist: 'Modem Club', cover: 'dialup', duration: 199 },
};

export type Playlist = { id: string; name: string; trackIds: string[]; sharedWith: number };

export const playlists: Playlist[] = [
  { id: 'pazar', name: 'Pazar Kasetleri', trackIds: ['moons', 'summer', 'night', 'laundry', 'floppy', 'slowmo', 'dialup'], sharedWith: 3 },
  { id: 'otobus', name: 'Son Otobüs', trackIds: ['slowmo', 'dialup', 'night', 'laundry'], sharedWith: 0 },
  { id: 'garaj', name: 'Garaj Demoları', trackIds: ['laundry', 'floppy', 'dialup', 'summer'], sharedWith: 3 },
];

export type Person = { id: string; name: string; initial: string; tone: 'ink' | 'chrome' | 'outline' | 'graphite' | 'light' };

export const people: Record<string, Person> = {
  me: { id: 'me', name: 'Yasir', initial: 'y', tone: 'ink' },
  elif: { id: 'elif', name: 'Elif', initial: 'e', tone: 'ink' },
  mert: { id: 'mert', name: 'Mert', initial: 'm', tone: 'chrome' },
  deniz: { id: 'deniz', name: 'Deniz', initial: 'd', tone: 'outline' },
  kaan: { id: 'kaan', name: 'Kaan', initial: 'k', tone: 'light' },
  burak: { id: 'burak', name: 'Burak', initial: 'b', tone: 'chrome' },
  selin: { id: 'selin', name: 'Selin', initial: 's', tone: 'graphite' },
};

export const nearbyRoom = {
  name: 'Café Bant',
  place: 'Moda, Kadıköy',
  playlist: 'Cuma Miksi',
  distanceM: 12,
  listeners: 23,
  queued: 18,
  nowPlaying: 'slowmo',
};

export const genres = [
  'Rock', 'Pop', 'Elektronik', 'Hip-hop', 'Caz', 'Indie', 'Anadolu Rock', 'Klasik',
  'R&B', 'Lo-fi', 'Metal', 'Funk', 'Arabesk', 'Alternatif', 'Soul', 'Ambient',
];

export const formatTime = (s: number) => {
  const m = Math.floor(Math.abs(s) / 60);
  const r = Math.floor(Math.abs(s) % 60);
  return `${s < 0 ? '-' : ''}${m}:${String(r).padStart(2, '0')}`;
};

// Jukebox slot code: A1…A5, B1…B5
export const slotCode = (i: number) => (i < 5 ? `A${i + 1}` : `B${i - 4}`);
