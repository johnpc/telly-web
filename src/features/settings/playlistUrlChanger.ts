import type { EpgSourceRepository } from '@/core/db/epgSourceRepository';
import type { PlaylistRepository } from '@/core/db/playlistRepository';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { type ImportOptions, importPlaylist } from '@/features/playlist/channelImporter';
import { rekeyPlaylistSettings } from '@/features/playlist/playlistKeyMigration';

export interface PlaylistUrlChangerDeps {
  fetchText: (url: string) => Promise<string>;
  playlists: PlaylistRepository;
  epgSources: EpgSourceRepository;
  settings: SettingsRepository;
  clock?: () => number;
}

/**
 * Settings -> Playlist URL edit (port of Android `PlaylistUrlChanger`): the
 * URL is the playlist's identity, so the stored row is re-keyed IN PLACE
 * (channels, per-playlist settings and custom EPG sources survive) and the
 * channels are re-fetched from the new URL. The new URL is fetched FIRST: a
 * failed fetch keeps the old URL untouched, the update-playlist idiom.
 */
export async function changePlaylistUrl(
  oldUrl: string,
  newUrl: string,
  deps: PlaylistUrlChangerDeps,
): Promise<boolean> {
  const existing = await deps.playlists.byUrl(oldUrl);
  const text = existing === null ? null : await fetchOrNull(deps, newUrl);
  if (existing === null || text === null) return false;
  if (!(await deps.playlists.changeUrl(oldUrl, newUrl))) return false;
  await deps.epgSources.rekeyPlaylist(oldUrl, newUrl);
  rekeyPlaylistSettings(deps.settings, oldUrl, newUrl);
  await importPlaylist(newUrl, text, importOptions(deps, existing.name));
  return true;
}

async function fetchOrNull(deps: PlaylistUrlChangerDeps, url: string): Promise<string | null> {
  try {
    return await deps.fetchText(url);
  } catch {
    return null;
  }
}

function importOptions(deps: PlaylistUrlChangerDeps, name: string): ImportOptions {
  return { name, playlists: deps.playlists, clock: deps.clock ?? ((): number => Date.now()) };
}
