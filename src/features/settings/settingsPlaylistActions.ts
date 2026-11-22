import {
  playlistEnabledSetting,
  playlistGroupEnabledSetting,
  playlistUpdateIntervalSetting,
  playlistUpdateOnStartSetting,
  playlistUserAgentSetting,
} from '@/features/playlist/playlistSettings';
import { playlistUpdateIntervalPicker } from './pickers/settingsPickers';
import { RowIds, suffixOf } from './rowIds';
import type { SettingsController } from './settingsController';
import { runRefresh, updateAllPlaylistsMessage, updatePlaylistMessage } from './settingsRefreshActions';
import { activePane, type SettingsPane } from './settingsUiState';

/** Playlist-list and per-playlist actions (port of Android `SettingsViewModelActions`/`PlaylistExtras`). */
export function runPlaylistAction(c: SettingsController, rowId: string): void {
  const group = suffixOf(rowId, RowIds.PLAYLIST_GROUP_PREFIX);
  if (group !== null) return flipPlaylistGroup(c, group);
  if (rowId === RowIds.ADD_PLAYLIST) return c.deps.callbacks.onAddPlaylist();
  if (rowId === RowIds.UPDATE_ALL_PLAYLISTS) return runRefresh(c, rowId, () => updateAllPlaylistsMessage(c));
  const url = c.currentDetailUrl();
  if (url !== null) runDetailAction(c, rowId, url);
}

function runDetailAction(c: SettingsController, rowId: string, url: string): void {
  switch (rowId) {
    case RowIds.PLAYLIST_UPDATE_NOW:
      return runRefresh(c, rowId, () => updatePlaylistMessage(c, url));
    case RowIds.PLAYLIST_ENABLE:
      return c.flip(playlistEnabledSetting(url));
    case RowIds.PLAYLIST_UPDATE_ON_START:
      return c.flip(playlistUpdateOnStartSetting(url));
    case RowIds.PLAYLIST_DELETE:
      return confirmDeleteOverlay(c);
    case RowIds.PLAYLIST_MANAGE_GROUPS:
      return c.push({ kind: 'PlaylistGroups', url });
    case RowIds.PLAYLIST_UPDATE_INTERVAL: {
      const current = String(c.deps.settings.get(playlistUpdateIntervalSetting(url)));
      return c.showOverlay({ kind: 'Picker', spec: playlistUpdateIntervalPicker(url), current });
    }
    default:
      return openDetailEditor(c, rowId, url);
  }
}

/** The per-playlist text editors carry their playlist (captured when the editor opens). */
function openDetailEditor(c: SettingsController, rowId: string, url: string): void {
  const item = c.currentDetailItem();
  const edits: Readonly<Record<string, { title: string; value: string }>> = {
    [RowIds.PLAYLIST_NAME]: { title: 'Playlist name', value: item?.name ?? url },
    [RowIds.PLAYLIST_URL]: { title: 'Playlist URL', value: url },
    [RowIds.PLAYLIST_USER_AGENT]: {
      title: 'User-Agent',
      value: c.deps.settings.get(playlistUserAgentSetting(url)),
    },
  };
  const edit = edits[rowId];
  if (edit !== undefined) c.showOverlay({ kind: 'TextEdit', rowId, ...edit, playlistUrl: url });
}

/** Manage groups: OK on a group row flips its enabled flag. */
function flipPlaylistGroup(c: SettingsController, group: string): void {
  const pane = activePane(c.state);
  if (pane?.kind === 'PlaylistGroups') c.flip(playlistGroupEnabledSetting(pane.url, group));
}

function confirmDeleteOverlay(c: SettingsController): void {
  const item = c.currentDetailItem();
  if (item !== null) c.showOverlay({ kind: 'ConfirmDelete', url: item.url, name: item.name });
}

/** OK on Delete in the captured GuidedStep confirm (screen 22). */
export async function confirmDeletePlaylist(c: SettingsController): Promise<void> {
  const confirm = c.state.overlay;
  if (confirm?.kind !== 'ConfirmDelete') return;
  c.ui.update((s) => ({ overlay: null, panes: s.panes.filter((pane) => pane.kind !== 'PlaylistDetail') }));
  await c.deps.playlists.remove(confirm.url);
}

/** Commits the per-playlist User-Agent ("" clears back to "Not set"). */
export function submitPlaylistUserAgent(c: SettingsController, url: string, value: string): void {
  c.deps.settings.set(playlistUserAgentSetting(url), value.trim());
}

/** Commits a rename; a blank name falls back to the URL. */
export async function submitPlaylistName(c: SettingsController, url: string, value: string): Promise<void> {
  const name = value.trim();
  await c.deps.playlists.rename(url, name === '' ? url : name);
}

/**
 * Commits the Playlist URL edit: fetch the new URL first, then re-key
 * everything tied to the old one. A failed fetch keeps the old URL. On
 * success the open detail pane is re-targeted so it keeps rendering the
 * moved playlist.
 */
export async function submitPlaylistUrl(c: SettingsController, oldUrl: string, raw: string): Promise<void> {
  const newUrl = raw.trim();
  if (newUrl === '' || newUrl === oldUrl) return;
  if (await c.deps.changePlaylistUrl(oldUrl, newUrl)) {
    c.ui.update((s) => ({ ...s, panes: s.panes.map((pane) => retarget(pane, oldUrl, newUrl)) }));
  }
}

function retarget(pane: SettingsPane, oldUrl: string, newUrl: string): SettingsPane {
  if ((pane.kind === 'PlaylistDetail' || pane.kind === 'PlaylistGroups') && pane.url === oldUrl) {
    return { ...pane, url: newUrl };
  }
  return pane;
}
