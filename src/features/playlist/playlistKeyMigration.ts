import type { SettingsRepository } from '@/core/settings/settingsRepository';

/** One key rename: the stored `value` moves from `from` to `to`. */
export interface KeyMove {
  from: string;
  to: string;
  value: string;
}

const EXACT_PREFIXES = [
  'playlist_enabled:',
  'playlist_user_agent:',
  'playlist_update_interval:',
  'playlist_update_on_start:',
];

const GROUP_PREFIX = 'playlist_group_enabled:';

function moveOf(key: string, value: string, oldUrl: string, newUrl: string): KeyMove | null {
  const exact = EXACT_PREFIXES.find((prefix) => key === prefix + oldUrl);
  if (exact !== undefined) return { from: key, to: exact + newUrl, value };
  const oldGroupPrefix = `${GROUP_PREFIX}${oldUrl}:`;
  if (key.startsWith(oldGroupPrefix)) {
    return { from: key, to: `${GROUP_PREFIX}${newUrl}:${key.slice(oldGroupPrefix.length)}`, value };
  }
  return null;
}

/**
 * The renames a playlist URL edit requires, computed from a raw settings
 * snapshot (port of Android `PlaylistKeyMigration`): the exact-suffix keys
 * and the group-enabled family, whose keys carry a group name after the URL.
 */
export function playlistKeyMoves(
  snapshot: Record<string, string>,
  oldUrl: string,
  newUrl: string,
): KeyMove[] {
  const out: KeyMove[] = [];
  for (const [key, value] of Object.entries(snapshot)) {
    const move = moveOf(key, value, oldUrl, newUrl);
    if (move !== null) out.push(move);
  }
  return out;
}

/** Applies the renames: write the new key, drop the old. */
export function rekeyPlaylistSettings(settings: SettingsRepository, oldUrl: string, newUrl: string): void {
  for (const move of playlistKeyMoves(settings.snapshot(), oldUrl, newUrl)) {
    settings.writeRaw(move.to, move.value);
    settings.removeRaw(move.from);
  }
}
