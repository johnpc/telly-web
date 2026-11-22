import type { SettingsController } from './settingsController';

/** Routes one manual refresh action through the controller's runner (one at a time). */
export function runRefresh(c: SettingsController, rowId: string, work: () => Promise<string>): void {
  void c.refresh.run(rowId, work);
}

/** "Update playlist" (detail pane): re-fetches the one URL. */
export async function updatePlaylistMessage(c: SettingsController, url: string): Promise<string> {
  return (await c.deps.updatePlaylist(url)) ? 'Playlist updated' : 'Playlist update failed';
}

/** "Update all playlists": every stored URL, folded into one line. */
export async function updateAllPlaylistsMessage(c: SettingsController): Promise<string> {
  const urls = c.feeds.playlists.map((item) => item.url);
  let updated = 0;
  for (const url of urls) if (await c.deps.updatePlaylist(url)) updated += 1;
  return allPlaylistsMessage(updated, urls.length);
}

/** "Playlists updated" / "Playlist update failed" / "Updated N of M playlists". */
export function allPlaylistsMessage(updated: number, total: number): string {
  if (updated === total && total > 0) return 'Playlists updated';
  return updated === 0 ? 'Playlist update failed' : `Updated ${updated} of ${total} playlists`;
}

/** "Update EPG": success = at least one playlist's sources refreshed. */
export async function updateEpgMessage(c: SettingsController): Promise<string> {
  return (await c.deps.updateEpgNow()) > 0 ? 'EPG updated' : 'EPG update failed';
}
