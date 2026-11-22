import type { EpgSourceRow } from '@/core/db/types';
import { RowIds } from './rowIds';
import type { SettingsController } from './settingsController';
import { activePane } from './settingsUiState';

/**
 * Custom EPG source management (Settings -> EPG -> EPG sources; port of
 * Android `SettingsViewModelEpgSources.kt`). URLs are validated like the
 * wizard's (http/https); invalid input is ignored on commit.
 */

export function currentEpgSource(c: SettingsController): EpgSourceRow | null {
  const pane = activePane(c.state);
  if (pane?.kind !== 'EpgSourceDetail') return null;
  return c.feeds.epgSources.find((row) => row.id === pane.sourceId) ?? null;
}

export function editEpgSourceUrlOverlay(c: SettingsController): void {
  const source = currentEpgSource(c);
  if (source === null) return;
  c.showOverlay({
    kind: 'TextEdit',
    rowId: RowIds.EPG_SOURCE_URL,
    title: 'Source URL',
    value: source.url,
    playlistUrl: null,
  });
}

export function confirmDeleteEpgSourceOverlay(c: SettingsController): void {
  const source = currentEpgSource(c);
  if (source === null) return;
  c.showOverlay({ kind: 'ConfirmDeleteSource', sourceId: source.id, name: epgHost(source.url) });
}

function epgHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** http(s) URLs only, trimmed; null for anything else. */
export function validEpgSourceUrl(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}

/** Add commits attach to the enclosing playlist pane, else the first playlist. */
export async function addEpgSource(c: SettingsController, rawUrl: string, nowMs = Date.now()): Promise<void> {
  const url = validEpgSourceUrl(rawUrl);
  const playlistUrl = enclosingPlaylistUrl(c);
  if (url === null || playlistUrl === null) return;
  await c.deps.epgSources.add(playlistUrl, url, nowMs);
}

export async function setEpgSourceUrl(c: SettingsController, rawUrl: string): Promise<void> {
  const url = validEpgSourceUrl(rawUrl);
  const source = currentEpgSource(c);
  if (url === null || source === null) return;
  await c.deps.epgSources.setUrl(source.id, url);
}

/** OK on Delete in the source confirm: remove the source and pop its pane. */
export async function confirmDeleteEpgSource(c: SettingsController): Promise<void> {
  const confirm = c.state.overlay;
  if (confirm?.kind !== 'ConfirmDeleteSource') return;
  c.ui.update((s) => ({ overlay: null, panes: s.panes.filter((pane) => pane.kind !== 'EpgSourceDetail') }));
  await c.deps.epgSources.remove(confirm.sourceId);
}

function enclosingPlaylistUrl(c: SettingsController): string | null {
  const detail = [...c.state.panes].reverse().find((pane) => pane.kind === 'PlaylistDetail');
  if (detail?.kind === 'PlaylistDetail') return detail.url;
  return c.feeds.playlists[0]?.url ?? null;
}
