import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { channelRepository } from '@/core/db/channelRepository';
import { epgSourceRepository } from '@/core/db/epgSourceRepository';
import { playlistRepository } from '@/core/db/playlistRepository';
import { recordingRepository } from '@/core/db/recordingRepository';
import { reminderRepository } from '@/core/db/reminderRepository';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { TellySettings } from '@/core/settings/tellySettings';
import { useSettingValue } from '@/core/settings/useSetting';
import { useAutoBackupStatus } from './backup/autoBackupEngine';
import { toPlaylistItems } from './playlistItems';
import { toReminderItems } from './reminderItems';
import { EMPTY_FEEDS, type RecordingStorageInfo, type SettingsFeeds } from './settingsFeeds';

/** `navigator.storage.estimate()` where it exists (jsdom and old TV browsers lack it). */
function browserEstimate(): Promise<StorageEstimate> {
  return typeof navigator.storage?.estimate === 'function'
    ? navigator.storage.estimate()
    : Promise.resolve({});
}

/** Bytes used by recordings + the origin's free quota (`navigator.storage.estimate`). */
export async function recordingStorage(
  estimate: () => Promise<StorageEstimate> = browserEstimate,
): Promise<RecordingStorageInfo> {
  const [rows, quota] = await Promise.all([
    recordingRepository.all(),
    estimate().catch((): StorageEstimate => ({})),
  ]);
  const usedBytes = rows.reduce((sum, row) => sum + row.sizeBytes, 0);
  return { usedBytes, freeBytes: Math.max(0, (quota.quota ?? 0) - (quota.usage ?? 0)) };
}

/** The live data feeds every deeper settings pane joins (Android `SettingsFeeds`). */
export function useSettingsFeeds(): SettingsFeeds {
  const queried = useFeedQueries();
  const autoBackup = useAutoBackupStatus();
  return useMemo(() => ({ ...EMPTY_FEEDS, ...queried, autoBackup }), [queried, autoBackup]);
}

/** The Dexie-backed feeds; each is absent until its first read resolves. */
function useFeedQueries(): Partial<SettingsFeeds> {
  const settings = useSettingsRepository();
  const clock = useSettingValue(settings, TellySettings.CLOCK_FORMAT);
  const playlists = useLiveQuery(
    async () => toPlaylistItems(await playlistRepository.all(), await channelRepository.all()),
    [],
  );
  const epgSources = useLiveQuery(() => epgSourceRepository.all(), []);
  const reminders = useLiveQuery(
    async () =>
      toReminderItems(
        await reminderRepository.upcoming(),
        await channelRepository.all(),
        clock === '12-hour',
      ),
    [clock],
  );
  const blockedChannels = useLiveQuery(
    async () => (await channelRepository.visible()).filter((channel) => channel.blocked),
    [],
  );
  const recording = useLiveQuery(() => recordingStorage(), []);
  return useMemo(
    () =>
      definedOnly<Omit<SettingsFeeds, 'autoBackup'>>({
        playlists,
        epgSources,
        reminders,
        blockedChannels,
        recording,
      }),
    [playlists, epgSources, reminders, blockedChannels, recording],
  );
}

/** Drops the still-loading (undefined) feeds so the defaults beneath show through. */
export function definedOnly<T extends object>(feeds: { [K in keyof T]: T[K] | undefined }): Partial<T> {
  return Object.fromEntries(Object.entries(feeds).filter(([, value]) => value !== undefined)) as Partial<T>;
}
