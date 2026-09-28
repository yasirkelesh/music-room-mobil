// Thin API client. Screens use mock data for now; switch them to these calls
// once the NestJS backend is up. Set EXPO_PUBLIC_API_URL in a .env file.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  // auth
  login: (email: string, password: string) => request<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (body: { name: string; username: string; email: string; password: string }) => request<{ ok: true }>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  verifyEmail: (code: string) => request<{ accessToken: string }>('/auth/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  forgotPassword: (email: string) => request<{ ok: true }>('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  // V.2.1 Track Vote
  vote: (eventId: string, trackId: string, dir: 1 | -1 | 0) => request(`/events/${eventId}/votes`, { method: 'POST', body: JSON.stringify({ trackId, dir }) }),
  // V.2.2 Control Delegation
  setDeviceDelegates: (deviceId: string, userIds: string[]) => request(`/devices/${deviceId}/delegates`, { method: 'PUT', body: JSON.stringify({ userIds }) }),
  // V.2.3 Playlist Editor
  moveTrack: (playlistId: string, trackId: string, toIndex: number, version: number) =>
    request(`/playlists/${playlistId}/move`, { method: 'POST', body: JSON.stringify({ trackId, toIndex, version }) }),
};
