import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useSettingValue } from '@/core/settings/useSetting';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { TellySettings } from '@/core/settings/tellySettings';
import type { ImportResult } from './channelImporter';
import { defaultRefreshDeps, type PlaylistRefreshDeps, updatePlaylist } from './playlistRefresh';

export interface PlaylistRefreshInput {
  url: string;
  /** Set when adding a playlist; null keeps the stored name. */
  name?: string | null;
}

/**
 * Fetch + import a playlist and stamp `lastUpdatedMs` (the "Update playlist"
 * / add-playlist action) as a TanStack mutation over the CORS-proxy setting.
 */
export function usePlaylistRefresh(
  overrides: Partial<PlaylistRefreshDeps> = {},
): UseMutationResult<ImportResult, Error, PlaylistRefreshInput> {
  const proxyBase = useSettingValue(useSettingsRepository(), TellySettings.CORS_PROXY);
  return useMutation({
    mutationFn: ({ url, name }: PlaylistRefreshInput) =>
      updatePlaylist(url, defaultRefreshDeps(proxyBase, overrides), name ?? null),
  });
}
