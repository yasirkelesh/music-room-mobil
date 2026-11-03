// Which back-end the app talks to (subject V.5: "the back-end's address must be configurable on the
// application for tests"). The choice is stored on the phone and applied before the first request.

import * as SecureStore from 'expo-secure-store';
import { DEFAULT_BASE_URL, getBaseUrl, setBaseUrl } from '@/api/client';

const KEY = 'musicroom.apiUrl';

/** Read the stored address, if any, and point the client at it. Call once at launch, before any request. */
export async function loadServerAddress() {
  const saved = await SecureStore.getItemAsync(KEY).catch(() => null);
  if (saved) setBaseUrl(saved);
}

/** Store and apply an address; null goes back to the build's default. */
export async function saveServerAddress(url: string | null) {
  setBaseUrl(url);
  if (url && url !== DEFAULT_BASE_URL) await SecureStore.setItemAsync(KEY, getBaseUrl()).catch(() => {});
  else await SecureStore.deleteItemAsync(KEY).catch(() => {});
}

export const isDefaultServer = () => getBaseUrl() === DEFAULT_BASE_URL;

/** "192.168.1.5:8085" → "http://192.168.1.5:8085". Null when it cannot be a URL. */
export function normalizeAddress(input: string): string | null {
  let s = input.trim().replace(/\/+$/, '');
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname) return null;
    return `${u.protocol}//${u.host}${u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

/** Asks the address's liveness probe (`GET /health`). Resolves with a reason when it is not reachable. */
export async function probeServer(url: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10_000);
  try {
    const res = await fetch(`${url}/health`, { signal: ctl.signal });
    return res.ok ? { ok: true } : { ok: false, reason: `Sunucu yanıt verdi ama sağlıklı değil (HTTP ${res.status}).` };
  } catch (e) {
    return { ok: false, reason: e instanceof Error && e.name === 'AbortError' ? '10 saniyede yanıt gelmedi.' : 'Bu adrese bağlanılamadı.' };
  } finally {
    clearTimeout(t);
  }
}

/** Short form for showing in the UI: host and port, without the scheme. */
export const displayAddress = (url = getBaseUrl()) => url.replace(/^https?:\/\//, '');
