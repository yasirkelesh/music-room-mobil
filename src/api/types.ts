/* eslint-disable @typescript-eslint/no-redeclare -- `const X` + `type X` is the enum-like pattern used for the wire enums */
// Wire types for MusicRoom.WebAPI v1 (music-room-openapi.json). Enum values come from the
// backend's Domain/Common — the OpenAPI document only says "integer".

export const Visibility = { Public: 0, Private: 1 } as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const LicenceMode = { Everyone: 0, InvitedOnly: 1, LocationAndTimeRestricted: 2 } as const;
export type LicenceMode = (typeof LicenceMode)[keyof typeof LicenceMode];

export const PresenceProof = { Geofence: 0, EventCode: 1, Both: 2 } as const;
export type PresenceProof = (typeof PresenceProof)[keyof typeof PresenceProof];

export const FieldVisibility = { Public: 0, Friends: 1, Private: 2 } as const;
export type FieldVisibility = (typeof FieldVisibility)[keyof typeof FieldVisibility];

export const PlaybackSourceType = { Event: 0, Playlist: 1 } as const;
export type PlaybackSourceType = (typeof PlaybackSourceType)[keyof typeof PlaybackSourceType];

export type Uuid = string;

/* ---------- auth ---------- */

export type TokenPair = { accessToken: string; refreshToken: string; expiresIn: number };

export type SessionInfo = {
  sessionId: Uuid; platform: string; device: string; appVersion: string; startedAt: string; expiresAt: string;
};

/* ---------- profile / social ---------- */

export type ProfileField<T = string> = { value: T | null; visibility: FieldVisibility };

export type OwnProfile = {
  displayName: string;
  realName: ProfileField;
  bio: ProfileField;
  location: ProfileField;
  birthDate: ProfileField;
  genres: string[];
  artists: string[];
};

export type UpdateProfile = Partial<Record<'realName' | 'bio' | 'location' | 'birthDate', ProfileField>>;

export type VisibleProfile = {
  userId: Uuid; displayName: string;
  realName?: string | null; bio?: string | null; location?: string | null; birthDate?: string | null;
};

export type UserSearchResult = { userId: Uuid; displayName: string };
export type Friend = { userId: Uuid; displayName: string; friendsSince: string };
export type FriendRequest = { requestId: Uuid; userId: Uuid; displayName: string; requestedAt: string };

/* ---------- playlists ---------- */

export type PlaylistSummary = { playlistId: Uuid; name: string; visibility: Visibility; ownerId: Uuid };
export type Playlist = PlaylistSummary & { licence: LicenceMode; mayEdit: boolean };
export type PlaylistTrack = { playlistTrackId: Uuid; youtubeVideoId: string; position: number; addedByUserId: Uuid };
export type Collaborator = { userId: Uuid; displayName: string; canEdit: boolean };

/* ---------- events ---------- */

export type Geofence = { latitude: number; longitude: number; radiusMetres: number };

export type EventSummary = {
  eventId: Uuid; name: string; visibility: Visibility; startsAtUtc: string; endsAtUtc: string; ownerId: Uuid;
};
export type EventDetail = EventSummary & { licence: LicenceMode; geofence: Geofence | null };

export type EventCreation = {
  name: string; startsAtUtc: string; endsAtUtc: string;
  visibility?: Visibility | null; licence?: LicenceMode | null;
  presenceProof?: PresenceProof | null; geofence?: Geofence | null;
};

export type EventLicence = {
  visibility: Visibility; licence: LicenceMode;
  presenceProof?: PresenceProof | null; geofence?: Geofence | null;
};

export type QueueEntry = {
  suggestionId: Uuid; youtubeVideoId: string; suggestedByUserId: Uuid; votes: number; callerVoted: boolean;
};

export type VotePresence = { coordinates?: { latitude: number; longitude: number } | null; eventCode?: string | null };
export type Invitation = { userId: Uuid; displayName: string };

/* ---------- catalog / devices / playback ---------- */

export type TrackMetadata = {
  youtubeVideoId: string; title: string; channel: string; durationSeconds: number; thumbnailUrl: string;
};

export type Device = {
  deviceId: Uuid; platform: string; model: string; appVersion: string; controllerUserId: Uuid | null;
};
export type DeviceControl = {
  deviceId: Uuid; ownerId: Uuid; controllerUserId: Uuid; isDelegated: boolean; version: number;
};
export type ControlGrant = {
  deviceId: Uuid; ownerId: Uuid; ownerDisplayName: string; platform: string; model: string;
};

export type PlaybackSession = {
  sessionId: Uuid; deviceId: Uuid; sourceType: PlaybackSourceType; sourceId: Uuid;
  nowPlayingId: Uuid | null; startedAtUtc: string; endedAtUtc: string | null; version: number;
};

/* ---------- errors ---------- */

export type Problem = {
  type?: string | null; title?: string | null; status?: number | null; detail?: string | null;
  /** field → messages (422) */
  errors?: Record<string, string[]>;
  /** field → stable codes, same order as `errors` (422) */
  codes?: Record<string, string[]> | null;
  /** stable code for a refusal that names no field */
  code?: string | null;
};
