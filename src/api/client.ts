// Typed client for MusicRoom.WebAPI v1 (see music-room-openapi.json).
// The build's default comes from EXPO_PUBLIC_API_URL (.env / eas.json); on a physical device use the
// computer's LAN address, not localhost. The app can point elsewhere at runtime (Sunucu adresi screen,
// src/lib/serverAddress.ts), which is what testers use against their own back-end.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type * as T from './types';

const root = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8085' : 'http://localhost:8085');
/** The address this build was made for. */
export const DEFAULT_BASE_URL = root.replace(/\/+$/, '');
let baseUrl = DEFAULT_BASE_URL;
/** The back-end every request and hub connection goes to right now. */
export const getBaseUrl = () => baseUrl;
/** Point the app at another back-end (null: back to the build's default). Existing sessions belong to the old one. */
export const setBaseUrl = (url: string | null) => { baseUrl = url ? url.replace(/\/+$/, '') : DEFAULT_BASE_URL; };

/* ---------- client identity ----------
 * The API refuses any POST/PUT/PATCH/DELETE (and the SignalR handshake) that lacks these three
 * headers, or whose value is longer than 64 characters. */
const clip = (s: string) => s.slice(0, 64);
export const clientContext = {
  platform: clip(Platform.OS),
  device: clip(Device.modelName ?? Device.deviceName ?? 'unknown'),
  appVersion: clip(Constants.expoConfig?.version ?? '0.0.0'),
};
const clientHeaders = {
  'X-Client-Platform': clientContext.platform,
  'X-Client-Device': clientContext.device,
  'X-Client-App-Version': clientContext.appVersion,
};

/* ---------- errors ---------- */

export class ApiError extends Error {
  constructor(public status: number, public problem: T.Problem | null, public network = false) {
    super(problem?.detail ?? problem?.title ?? (network ? 'Network request failed' : `HTTP ${status}`));
  }
  /** Stable codes the server attached (field codes first, then the top-level one). */
  get codes(): string[] {
    return [...Object.values(this.problem?.codes ?? {}).flat(), ...(this.problem?.code ? [this.problem.code] : [])];
  }
  /** Messages of a 422, keyed by the field the client sent. */
  get fieldErrors(): Record<string, string[]> { return this.problem?.errors ?? {}; }
}

/* ---------- session (tokens) ---------- */

type SessionHooks = {
  /** Called after every successful rotation so the refresh token can be persisted. */
  onTokens: (pair: T.TokenPair) => void | Promise<void>;
  /** Called when the refresh token is rejected: the session is over. */
  onExpired: () => void;
};

let accessToken: string | null = null;
let expiresAt = 0;
let refreshToken: string | null = null;
let hooks: SessionHooks = { onTokens: () => {}, onExpired: () => {} };
let refreshing: Promise<boolean> | null = null;

export const session = {
  configure(h: SessionHooks) { hooks = h; },
  set(pair: T.TokenPair | null) {
    accessToken = pair?.accessToken ?? null;
    refreshToken = pair?.refreshToken ?? null;
    expiresAt = pair ? Date.now() + pair.expiresIn * 1000 : 0;
  },
  /** Seed with a stored refresh token only; the first call rotates it into an access token. */
  setRefreshOnly(token: string) { accessToken = null; refreshToken = token; },
  get accessToken() { return accessToken; },
  get hasSession() { return !!(accessToken || refreshToken); },
  /** True when the access token is gone or within 30 s of expiring — refresh before opening a socket. */
  get expiringSoon() { return !accessToken || Date.now() > expiresAt - 30_000; },
};

/**
 * fetch with a deadline. A sleeping free-tier server can take most of a minute to wake;
 * past that the request is treated as "unreachable" instead of hanging the screen forever.
 */
const TIMEOUT_MS = 45_000;
function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(t));
}

/** Single-flight rotation: concurrent 401s share one refresh, because a refresh token is spent once. */
export function refreshSession(): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const res = await timedFetch(`${getBaseUrl()}/api/v1/auth/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...clientHeaders },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.ok) {
        const pair = (await res.json()) as T.TokenPair;
        session.set(pair);
        await hooks.onTokens(pair);
        return true;
      }
      // 401/400: the family is dead. Anything else (5xx, offline) leaves the session alone.
      if (res.status === 401 || res.status === 400) { session.set(null); hooks.onExpired(); }
      return false;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/* ---------- transport ---------- */

type Opts = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** ETag from a previous read, sent as If-Match. */
  ifMatch?: string | number | null;
  anon?: boolean;
  form?: Record<string, string>;
};
export type Res<D> = { data: D; etag: string | null; location: string | null; status: number };

const qs = (q?: Opts['query']) => {
  const p = Object.entries(q ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return p.length ? '?' + p.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&') : '';
};

export const etagOf = (version: number) => `"${version}"`;

async function send<D>(path: string, o: Opts, retry: boolean): Promise<Res<D>> {
  const headers: Record<string, string> = { Accept: 'application/json', ...clientHeaders };
  let body: string | undefined;
  if (o.form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(o.form).toString(); }
  else if (o.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(o.body); }
  if (!o.anon && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (o.ifMatch !== undefined && o.ifMatch !== null) {
    const v = String(o.ifMatch);
    headers['If-Match'] = v.startsWith('"') ? v : etagOf(Number(v));
  }

  let res: Response;
  try {
    res = await timedFetch(`${getBaseUrl()}${path}${qs(o.query)}`, { method: o.method ?? 'GET', headers, body });
  } catch {
    throw new ApiError(0, null, true);
  }

  if (res.status === 401 && !o.anon && retry && refreshToken && (await refreshSession())) {
    return send<D>(path, o, false);
  }
  if (!res.ok) {
    let problem: T.Problem | null = null;
    try { problem = (await res.json()) as T.Problem; } catch { /* bodiless */ }
    throw new ApiError(res.status, problem);
  }
  let data: unknown = undefined;
  if (res.status !== 204) {
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  }
  return { data: data as D, etag: res.headers.get('ETag'), location: res.headers.get('Location'), status: res.status };
}

const call = <D = void>(path: string, o: Opts = {}) => send<D>(path, o, true);
const data = async <D = void>(path: string, o: Opts = {}) => (await call<D>(path, o)).data;
const J = (method: string, body?: unknown, extra: Opts = {}): Opts => ({ method, body, ...extra });

const page = (p?: { page?: number; pageSize?: number }) => ({ page: p?.page, pageSize: p?.pageSize });
type Page = { page?: number; pageSize?: number };

/* ---------- endpoints ---------- */

export const api = {
  health: () => data<Record<string, string>>('/health', { anon: true }),

  auth: {
    register: (b: { email: string; password: string; displayName: string }) =>
      data('/api/v1/auth/registrations', J('POST', b, { anon: true })),
    /** Either the long `token` from the mail's link, or the six-character `code` with the address it went to. */
    verifyEmail: (cred: { token: string } | { email: string; code: string }) =>
      data('/api/v1/auth/email-verifications', J('POST', 'token' in cred ? { token: cred.token } : { token: null, email: cred.email, code: cred.code }, { anon: true })),
    resendVerification: (email: string) => data('/api/v1/auth/verification-requests', J('POST', { email }, { anon: true })),
    signIn: (email: string, password: string) =>
      data<T.TokenPair>('/api/v1/auth/sessions', J('POST', { email, password }, { anon: true })),
    signInSocial: (b: { provider: string; code: string; codeVerifier: string; redirectUri: string }) =>
      data<T.TokenPair>('/api/v1/auth/sessions/social', J('POST', b, { anon: true })),
    signOut: () => data('/api/v1/auth/sessions/current', { method: 'DELETE' }),
    sessions: () => data<T.SessionInfo[]>('/api/v1/auth/sessions'),
    endSession: (id: T.Uuid) => data(`/api/v1/auth/sessions/${id}`, { method: 'DELETE' }),
    requestPasswordReset: (email: string) => data('/api/v1/auth/password-reset-requests', J('POST', { email }, { anon: true })),
    resetPassword: (token: string, newPassword: string) =>
      data('/api/v1/auth/password-resets', J('POST', { token, newPassword }, { anon: true })),
    changePassword: (currentPassword: string, newPassword: string) =>
      data('/api/v1/me/password', J('POST', { currentPassword, newPassword })),
    socialLinks: () => data<{ provider: string; email: string | null; linkedAtUtc: string }[]>('/api/v1/auth/social-links'),
    linkSocial: (b: { provider: string; code: string; codeVerifier: string; redirectUri: string }) =>
      data('/api/v1/auth/social-links', J('POST', b)),
    unlinkSocial: (provider: string) => data(`/api/v1/auth/social-links/${provider}`, { method: 'DELETE' }),
  },

  me: {
    get: () => data<T.OwnProfile>('/api/v1/me'),
    /** The account's own email (OpenID userinfo). */
    userInfo: () => data<{ sub: string; email?: string | null; email_verified?: boolean | null; name?: string | null }>('/oauth2/userinfo'),
    updateProfile: (b: T.UpdateProfile) => data('/api/v1/me/profile', J('PATCH', b)),
    setMusicPreferences: (b: { genres: string[]; artists: string[] }) => data('/api/v1/me/music-preferences', J('PUT', b)),
    controlGrants: () => data<T.ControlGrant[]>('/api/v1/me/control-grants'),
  },

  friends: {
    list: (p?: Page) => data<T.Friend[]>('/api/v1/me/friends', { query: page(p) }),
    remove: (userId: T.Uuid) => data(`/api/v1/me/friends/${userId}`, { method: 'DELETE' }),
    requests: (direction: 'incoming' | 'outgoing', p?: Page) =>
      data<T.FriendRequest[]>('/api/v1/me/friend-requests', { query: { direction, ...page(p) } }),
    ask: (targetUserId: T.Uuid) => data('/api/v1/me/friend-requests', J('POST', { targetUserId })),
    answer: (requestId: T.Uuid, status: 'accepted' | 'declined') =>
      data(`/api/v1/me/friend-requests/${requestId}`, J('PATCH', { status })),
    withdraw: (requestId: T.Uuid) => data(`/api/v1/me/friend-requests/${requestId}`, { method: 'DELETE' }),
  },

  users: {
    search: (q: string, p?: Page) => data<T.UserSearchResult[]>('/api/v1/users', { query: { q, ...page(p) } }),
    get: (userId: T.Uuid) => data<T.VisibleProfile>(`/api/v1/users/${userId}`),
  },

  playlists: {
    list: (scope: 'mine' | 'shared' | 'public' = 'mine', p?: Page) =>
      data<T.PlaylistSummary[]>('/api/v1/playlists', { query: { scope, ...page(p) } }),
    create: async (b: { name: string; visibility?: T.Visibility | null; licence?: T.LicenceMode | null }) =>
      (await call<{ playlistId: T.Uuid }>('/api/v1/playlists', J('POST', b))).data,
    /** `etag` goes back as If-Match on rename. */
    get: (id: T.Uuid) => call<T.Playlist>(`/api/v1/playlists/${id}`),
    rename: (id: T.Uuid, name: string, etag: string) => data(`/api/v1/playlists/${id}`, J('PATCH', { name }, { ifMatch: etag })),
    remove: (id: T.Uuid) => data(`/api/v1/playlists/${id}`, { method: 'DELETE' }),
    setLicence: (id: T.Uuid, b: { visibility: T.Visibility; licence: T.LicenceMode }) =>
      data(`/api/v1/playlists/${id}/licence`, J('PUT', b)),
    collaborators: (id: T.Uuid) => data<T.Collaborator[]>(`/api/v1/playlists/${id}/collaborators`),
    addCollaborator: (id: T.Uuid, userId: T.Uuid, canEdit: boolean) =>
      data(`/api/v1/playlists/${id}/collaborators`, J('POST', { userId, canEdit })),
    removeCollaborator: (id: T.Uuid, userId: T.Uuid) =>
      data(`/api/v1/playlists/${id}/collaborators/${userId}`, { method: 'DELETE' }),
    /** Every track in order (the API pages at 50), with the ETag that guards the next write. */
    allTracks: async (id: T.Uuid) => {
      const out: T.PlaylistTrack[] = [];
      let etag: string | null = null;
      for (let page = 1; page <= 20; page++) {
        const r = await call<T.PlaylistTrack[]>(`/api/v1/playlists/${id}/tracks`, { query: { page, pageSize: 50 } });
        out.push(...r.data);
        etag = r.etag;
        if (r.data.length < 50) break;
      }
      return { tracks: out.sort((a, b) => a.position - b.position), etag };
    },
    addTrack: async (id: T.Uuid, b: { youtubeVideoId: string; afterTrackId?: T.Uuid | null; atHead?: boolean | null }, etag: string) =>
      (await call<{ playlistTrackId: T.Uuid }>(`/api/v1/playlists/${id}/tracks`, J('POST', b, { ifMatch: etag }))).data,
    moveTrack: (id: T.Uuid, trackId: T.Uuid, dest: { afterTrackId: T.Uuid } | { beforeTrackId: T.Uuid }, etag: string) =>
      data(`/api/v1/playlists/${id}/tracks/${trackId}`, J('PATCH', dest, { ifMatch: etag })),
    removeTrack: (id: T.Uuid, trackId: T.Uuid, etag: string) =>
      data(`/api/v1/playlists/${id}/tracks/${trackId}`, { method: 'DELETE', ifMatch: etag }),
  },

  events: {
    list: (scope: 'mine' | 'invited' | 'public' = 'mine', p?: Page) =>
      data<T.EventSummary[]>('/api/v1/events', { query: { scope, ...page(p) } }),
    create: async (b: T.EventCreation) => (await call<{ eventId: T.Uuid }>('/api/v1/events', J('POST', b))).data,
    get: (id: T.Uuid) => call<T.EventDetail>(`/api/v1/events/${id}`),
    update: (id: T.Uuid, b: { name: string; startsAtUtc: string; endsAtUtc: string }, etag: string) =>
      data(`/api/v1/events/${id}`, J('PATCH', b, { ifMatch: etag })),
    remove: (id: T.Uuid) => data(`/api/v1/events/${id}`, { method: 'DELETE' }),
    setLicence: (id: T.Uuid, b: T.EventLicence) => data(`/api/v1/events/${id}/licence`, J('PUT', b)),
    invitations: (id: T.Uuid) => data<T.Invitation[]>(`/api/v1/events/${id}/invitations`),
    invite: (id: T.Uuid, userId: T.Uuid) => data(`/api/v1/events/${id}/invitations`, J('POST', { userId })),
    uninvite: (id: T.Uuid, userId: T.Uuid) => data(`/api/v1/events/${id}/invitations/${userId}`, { method: 'DELETE' }),
    join: (id: T.Uuid) => data(`/api/v1/events/${id}/attendances`, { method: 'POST' }),
    leave: (id: T.Uuid) => data(`/api/v1/events/${id}/attendances/current`, { method: 'DELETE' }),
    queue: (id: T.Uuid, p?: Page) => data<T.QueueEntry[]>(`/api/v1/events/${id}/queue`, { query: page(p) }),
    suggest: (id: T.Uuid, youtubeVideoId: string) => data(`/api/v1/events/${id}/tracks`, J('POST', { youtubeVideoId })),
    removeSuggestion: (id: T.Uuid, suggestionId: T.Uuid) =>
      data(`/api/v1/events/${id}/tracks/${suggestionId}`, { method: 'DELETE' }),
    /** Idempotent. On a LocationAndTimeRestricted event pass `presence`. */
    vote: (id: T.Uuid, suggestionId: T.Uuid, presence?: T.VotePresence) =>
      data(`/api/v1/events/${id}/tracks/${suggestionId}/vote`, J('PUT', presence ? { presence } : undefined)),
    unvote: (id: T.Uuid, suggestionId: T.Uuid) =>
      data(`/api/v1/events/${id}/tracks/${suggestionId}/vote`, { method: 'DELETE' }),
    /** The party's live playback session, for anybody who may see the event. 404: nothing plays. */
    playbackSession: (id: T.Uuid) => call<T.PlaybackSession>(`/api/v1/events/${id}/playback-session`),
    issueCode: (id: T.Uuid, ttlSeconds?: number) =>
      data<{ code: string }>(`/api/v1/events/${id}/event-codes`, J('POST', ttlSeconds ? { ttlSeconds } : undefined)),
  },

  tracks: {
    search: (q: string, p?: Page) => data<T.TrackMetadata[]>('/api/v1/tracks', { query: { q, ...page(p) } }),
    get: (youtubeVideoId: string) => data<T.TrackMetadata>(`/api/v1/tracks/${youtubeVideoId}`),
  },

  devices: {
    register: async () => (await call<{ deviceId: T.Uuid }>('/api/v1/devices', { method: 'POST' })).data,
    list: () => data<T.Device[]>('/api/v1/devices'),
    remove: (id: T.Uuid) => data(`/api/v1/devices/${id}`, { method: 'DELETE' }),
    control: (id: T.Uuid) => call<T.DeviceControl>(`/api/v1/devices/${id}/control`),
    grantControl: (id: T.Uuid, granteeUserId: T.Uuid, etag: string) =>
      data(`/api/v1/devices/${id}/control`, J('PUT', { granteeUserId }, { ifMatch: etag })),
    releaseControl: (id: T.Uuid) => data(`/api/v1/devices/${id}/control`, { method: 'DELETE' }),
    playbackSession: (id: T.Uuid) => call<T.PlaybackSession>(`/api/v1/devices/${id}/playback-session`),
  },

  playback: {
    start: async (b: { deviceId: T.Uuid; sourceType: T.PlaybackSourceType; sourceId: T.Uuid }) =>
      (await call<{ sessionId: T.Uuid; nowPlayingId: T.Uuid | null }>('/api/v1/playback-sessions', J('POST', b))).data,
    get: (id: T.Uuid) => call<T.PlaybackSession>(`/api/v1/playback-sessions/${id}`),
    jump: (id: T.Uuid, nowPlayingId: T.Uuid, etag: string) =>
      data(`/api/v1/playback-sessions/${id}`, J('PATCH', { nowPlayingId }, { ifMatch: etag })),
    stop: (id: T.Uuid) => data(`/api/v1/playback-sessions/${id}`, { method: 'DELETE' }),
    /**
     * The playing device says where its playhead is in `nowPlayingId`; the server stamps the time and tells
     * the party (a report for a track no longer playing is dropped there). At most one per second: 429.
     */
    reportPosition: (id: T.Uuid, b: { nowPlayingId: T.Uuid; positionMs: number; paused: boolean }) =>
      data(`/api/v1/playback-sessions/${id}/position`, J('PUT', b)),
    advance: (id: T.Uuid, expectedNowPlayingId: T.Uuid | null, etag?: string) =>
      data<T.PlaybackSession>(`/api/v1/playback-sessions/${id}/advances`, J('POST', { expectedNowPlayingId }, { ifMatch: etag })),
  },
};
