import type { PlaylistRepository } from '@/core/db/playlistRepository';
import { type BackupPayload, BACKUP_VERSION, decodeBackup, encodeBackup } from '@/core/settings/backupCodec';
import type { SettingsRepository } from '@/core/settings/settingsRepository';

export const BACKUP_FILE_NAME = 'telly-backup.json';
export const BACKUP_MIME_TYPE = 'application/json';

/**
 * Back up / restore of settings + playlist identities as a JSON file
 * (Settings -> General -> "Back up data" / "Restore data"; port of Android
 * `SettingsBackupManager`). A restored playlist starts with zero channels;
 * `refetch` (the "Update playlist" path) brings them back.
 */
export class SettingsBackupManager {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly playlists: PlaylistRepository,
    private readonly clock: () => number = (): number => Date.now(),
  ) {}

  async payload(): Promise<BackupPayload> {
    return {
      version: BACKUP_VERSION,
      settings: this.settings.snapshot(),
      playlists: (await this.playlists.all()).map((row) => ({
        name: row.name,
        url: row.url,
        epgUrl: row.epgUrl,
      })),
    };
  }

  async exportJson(): Promise<string> {
    return encodeBackup(await this.payload());
  }

  /** The auto-backup payload: null while there is nothing worth backing up (no playlists). */
  async exportJsonIfAny(): Promise<string | null> {
    const payload = await this.payload();
    return payload.playlists.length === 0 ? null : encodeBackup(payload);
  }

  /** Applies a backup; returns the restored playlist URLs, or null when `json` is not a telly backup. */
  async importJson(json: string): Promise<string[] | null> {
    const payload = decodeBackup(json);
    if (payload === null) return null;
    this.settings.restore(payload.settings);
    for (const entry of payload.playlists) {
      await this.playlists.add(
        entry.url,
        { epgUrl: entry.epgUrl, channels: [], vodItems: [] },
        entry.name,
        this.clock,
      );
    }
    return payload.playlists.map((entry) => entry.url);
  }
}

/**
 * Restore + re-fetch in one step (Settings -> Restore data; the welcome
 * screen's "Restore previous setup"): import the identities, then refresh
 * every playlist so its channels come back. False for a foreign file.
 */
export async function restoreBackup(
  json: string,
  manager: SettingsBackupManager,
  refetch: (url: string) => Promise<boolean>,
): Promise<boolean> {
  const urls = await manager.importJson(json);
  if (urls === null) return false;
  for (const url of urls) await refetch(url);
  return true;
}
