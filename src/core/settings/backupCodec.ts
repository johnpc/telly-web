/**
 * JSON codec for settings/playlist backup files (port of Android
 * `BackupCodec.kt`). The shape is IDENTICAL to the Android app's
 * `{ version, settings: {key: string}, playlists: [{name, url, epgUrl}] }`
 * so one file restores on either platform; unknown fields are ignored.
 */
export const BACKUP_VERSION = 1;

/** One playlist inside a backup: identity only; channels are re-fetched. */
export interface BackupPlaylist {
  name: string;
  url: string;
  epgUrl: string | null;
}

/** The backup file payload: every setting plus the playlist identities. */
export interface BackupPayload {
  version: number;
  settings: Record<string, string>;
  playlists: BackupPlaylist[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeSettings(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== 'string') return null;
    out[key] = raw;
  }
  return out;
}

/** A string field; `null`/absent become null; anything else is a shape error (undefined). */
function nullableString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

function decodeIdentity(value: Record<string, unknown>): Pick<BackupPlaylist, 'name' | 'url'> | null {
  const { name, url } = value;
  return typeof name === 'string' && typeof url === 'string' ? { name, url } : null;
}

function decodePlaylist(value: unknown): BackupPlaylist | null {
  if (!isRecord(value)) return null;
  const identity = decodeIdentity(value);
  const epgUrl = nullableString(value.epgUrl);
  if (identity === null || epgUrl === undefined) return null;
  return { ...identity, epgUrl };
}

function decodePlaylists(value: unknown): BackupPlaylist[] | null {
  if (!Array.isArray(value)) return null;
  const out: BackupPlaylist[] = [];
  for (const item of value) {
    const playlist = decodePlaylist(item);
    if (playlist === null) return null;
    out.push(playlist);
  }
  return out;
}

export function encodeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A missing version means v1 (the first format); a non-number is a shape error. */
function versionOf(parsed: Record<string, unknown>): number | null {
  const version = parsed.version ?? BACKUP_VERSION;
  return typeof version === 'number' ? version : null;
}

function decodeBody(parsed: Record<string, unknown>): BackupPayload | null {
  const version = versionOf(parsed);
  const settings = decodeSettings(parsed.settings);
  const playlists = decodePlaylists(parsed.playlists);
  if (version === null || settings === null || playlists === null) return null;
  return { version, settings, playlists };
}

/** Returns null when the text is not a telly backup. */
export function decodeBackup(text: string): BackupPayload | null {
  const parsed = parseJson(text);
  return isRecord(parsed) ? decodeBody(parsed) : null;
}
