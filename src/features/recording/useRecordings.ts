import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useSyncExternalStore } from 'react';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type RecordingRepository, recordingRepository } from '@/core/db/recordingRepository';
import { useClockStyle } from '@/features/playback/info/usePlayerSettings';
import type { Observable } from '@/features/guide/observable';
import { isRecording } from './recordingIndicator';
import { type RecordingListRow, recordingRows } from './recordingRows';

/**
 * The library rows, newest start first, live from the recordings table in the
 * user's clock style; undefined until the first read (Android `RecordingsViewModel.rows`).
 */
export function useRecordings(
  repository: RecordingRepository = recordingRepository,
): RecordingListRow[] | undefined {
  const style = useClockStyle();
  const entries = useLiveQuery(() => repository.all(), [repository]);
  return useMemo(() => (entries === undefined ? undefined : recordingRows(entries, style)), [entries, style]);
}

/** True while the channel with `channelId` has an in-progress recording (the transport record dot). */
export function useChannelRecording(
  channelId: number | null,
  deps: { recordings: RecordingRepository; channels: ChannelRepository } = {
    recordings: recordingRepository,
    channels: channelRepository,
  },
): boolean {
  return (
    useLiveQuery(async () => {
      if (channelId === null) return false;
      const [channel, active] = await Promise.all([
        deps.channels.byId(channelId),
        deps.recordings.byStatus('RECORDING'),
      ]);
      return isRecording(active, channel);
    }, [channelId, deps]) ?? false
  );
}

/** Re-renders on every change of one of the slice's observables (menu, form, library). */
export function useObservableVersion(observable: Observable): number {
  return useSyncExternalStore(observable.subscribe, () => observable.version);
}
