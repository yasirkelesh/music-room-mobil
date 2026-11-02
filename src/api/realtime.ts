// SignalR hubs (docs/api/ENDPOINTS.md §9). Mutations never go over a hub: state changes use REST and
// the hubs only push facts, so every handler here should end in a re-read or a small local patch.

import { AppState } from 'react-native';
import { HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, ILogger, LogLevel } from '@microsoft/signalr';
import { devlog } from '@/lib/devlog';
import { BASE_URL, clientContext, refreshSession, session } from './client';
import type { Uuid } from './types';

export type PlaylistEvent =
  | { kind: 'TrackAdded'; playlistId: Uuid; version: number; playlistTrackId: Uuid; youtubeVideoId: string }
  | { kind: 'TrackMoved'; playlistId: Uuid; version: number; playlistTrackId: Uuid }
  | { kind: 'TrackRemoved'; playlistId: Uuid; version: number; playlistTrackId: Uuid }
  | { kind: 'CollaboratorChanged'; playlistId: Uuid; version: number; userId: Uuid; removed: boolean };

export type EventHubEvent =
  | { kind: 'TrackSuggested'; eventId: Uuid; suggestionId: Uuid; youtubeVideoId: string }
  | { kind: 'VoteChanged'; eventId: Uuid; suggestionId: Uuid; votes: number }
  | { kind: 'QueueReordered'; eventId: Uuid; removedSuggestionId: Uuid };

export type NowPlayingEvent = { sourceId: Uuid; sessionId: Uuid; nowPlayingId: Uuid | null };
export type ControlEvent =
  | { kind: 'ControlGranted'; deviceId: Uuid; ownerId: Uuid; controllerUserId: Uuid }
  | { kind: 'ControlRevoked'; deviceId: Uuid; ownerId: Uuid }
  | { kind: 'ControlTakenOver'; deviceId: Uuid };

// A dropped socket is routine on a phone (backgrounding, Wi-Fi ↔ cellular) and is handled below by
// reconnecting; SignalR reports it as an error, which put a red LogBox over the app. Only what is
// really unexpected reaches the console.
const logger: ILogger = {
  log(level, message) {
    if (level < LogLevel.Warning) return;
    const routine = /WebSocket closed|Connection disconnected|reconnect|Failed to start the connection|Server timeout/i.test(message);
    if (routine || level < LogLevel.Critical) devlog('[hub]', message);
    else console.error('[hub]', message);
  },
};

/** Never give up: 0, 2, 5, 10 s, then every 30 s for as long as the screen is open. */
const retry = { nextRetryDelayInMilliseconds: (c: { previousRetryCount: number }) => [0, 2000, 5000, 10000][c.previousRetryCount] ?? 30000 };

function build(path: string): HubConnection {
  // The handshake carries the client context in the query string (a WebSocket cannot set headers).
  const q = new URLSearchParams({ platform: clientContext.platform, device: clientContext.device, appVersion: clientContext.appVersion });
  return new HubConnectionBuilder()
    .withUrl(`${BASE_URL}${path}?${q}`, {
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,
      accessTokenFactory: async () => {
        if (session.expiringSoon) await refreshSession();
        return session.accessToken ?? '';
      },
    })
    .withAutomaticReconnect(retry)
    .configureLogging(logger)
    .build();
}

type Subscription = { close: () => void };

/** Joins a group and re-joins after every reconnect (a reconnect is a new connection, so the gate is asked again). */
async function subscribe(
  path: string,
  join: { method: string; arg: Uuid } | null,
  handlers: Record<string, (payload: any) => void>,
  onResync: () => void,
): Promise<Subscription> {
  const hub = build(path);
  for (const [name, fn] of Object.entries(handlers)) hub.on(name, fn);
  const enter = async () => {
    if (join) await hub.invoke(join.method, join.arg);
    onResync();
  };
  let closed = false;
  hub.onreconnected(() => { enter().catch(() => {}); });
  // a connection that ended anyway (start failed, or the app slept through the retries) is started
  // again when the app comes back to the foreground
  const revive = () => {
    if (closed || hub.state !== HubConnectionState.Disconnected) return;
    hub.start().then(enter).catch(() => {});
  };
  const app = AppState.addEventListener('change', (s) => { if (s === 'active') revive(); });
  hub.onclose(() => { if (!closed && AppState.currentState === 'active') setTimeout(revive, 5000); });
  try {
    await hub.start();
    await enter();
  } catch (e) {
    app.remove();
    throw e;
  }
  return { close: () => { closed = true; app.remove(); hub.stop().catch(() => {}); } };
}

const lc = (o: Record<string, unknown>) => o; // payloads are camelCase JSON already

export const realtime = {
  playlist: (playlistId: Uuid, onEvent: (e: PlaylistEvent) => void, onResync: () => void) =>
    subscribe('/hubs/playlists', { method: 'JoinPlaylist', arg: playlistId }, {
      TrackAdded: (p) => onEvent({ kind: 'TrackAdded', ...lc(p) } as PlaylistEvent),
      TrackMoved: (p) => onEvent({ kind: 'TrackMoved', ...lc(p) } as PlaylistEvent),
      TrackRemoved: (p) => onEvent({ kind: 'TrackRemoved', ...lc(p) } as PlaylistEvent),
      CollaboratorChanged: (p) => onEvent({ kind: 'CollaboratorChanged', ...lc(p) } as PlaylistEvent),
      NowPlayingChanged: () => {},
    }, onResync),

  event: (eventId: Uuid, onEvent: (e: EventHubEvent) => void, onNowPlaying: (e: NowPlayingEvent) => void, onResync: () => void) =>
    subscribe('/hubs/events', { method: 'JoinEvent', arg: eventId }, {
      TrackSuggested: (p) => onEvent({ kind: 'TrackSuggested', ...lc(p) } as EventHubEvent),
      VoteChanged: (p) => onEvent({ kind: 'VoteChanged', ...lc(p) } as EventHubEvent),
      QueueReordered: (p) => onEvent({ kind: 'QueueReordered', ...lc(p) } as EventHubEvent),
      NowPlayingChanged: (p) => onNowPlaying(p as NowPlayingEvent),
    }, onResync),

  /** Per-account group, joined by the server on connect: no invocable methods. */
  control: (onEvent: (e: ControlEvent) => void, onResync: () => void) =>
    subscribe('/hubs/control', null, {
      ControlGranted: (p) => onEvent({ kind: 'ControlGranted', ...lc(p) } as ControlEvent),
      ControlRevoked: (p) => onEvent({ kind: 'ControlRevoked', ...lc(p) } as ControlEvent),
      ControlTakenOver: (p) => onEvent({ kind: 'ControlTakenOver', ...lc(p) } as ControlEvent),
    }, onResync),
};
