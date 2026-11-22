import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type TellyDb, VISIBILITY_EPOCH_KEY, tellyDb } from '@/core/db/tellyDb';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { playlistGroupEnabledSetting } from './playlistSettings';

export const GROUP_ENABLED_PREFIX = 'playlist_group_enabled:';

/**
 * Android `GroupFilteredChannelDao` wiring: the visible-channel feed honours
 * Settings → Playlists → Manage groups, and every write to a group-enabled
 * key bumps the visibility epoch so Dexie live queries re-run.
 */
export function installGroupVisibility(
  settings: SettingsRepository,
  channels: ChannelRepository = channelRepository,
  db: TellyDb = tellyDb,
): () => void {
  channels.setGroupFilter((url, group) => settings.get(playlistGroupEnabledSetting(url, group)));
  let known = snapshotGroupKeys(settings);
  return settings.subscribeChanges(() => {
    const next = snapshotGroupKeys(settings);
    if (next === known) return;
    known = next;
    void db.meta.put({ key: VISIBILITY_EPOCH_KEY, value: String(Date.now()) });
  });
}

/** Every group-enabled key with its value, as one comparable string. */
function snapshotGroupKeys(settings: SettingsRepository): string {
  return Object.entries(settings.snapshot())
    .filter(([key]) => key.startsWith(GROUP_ENABLED_PREFIX))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}
