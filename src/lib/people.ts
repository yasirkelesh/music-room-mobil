import type { Person } from '@/data/mock';

const tones: Person['tone'][] = ['ink', 'chrome', 'outline', 'graphite', 'light'];

/** Avatar-ready person from an API display name; the tone is stable per id so a user keeps one colour. */
export function personOf(displayName: string, id = displayName): Person {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { id, name: displayName, initial: (displayName.trim()[0] ?? '?').toLowerCase(), tone: tones[h % tones.length] };
}
