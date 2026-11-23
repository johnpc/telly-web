import { programTitle } from '@/features/epg/nowNext';
import { offsetsOfMinutes, queryFrom, shifted } from '@/features/epg/epgOffsets';
import { type GuideQueryDeps, defaultGuideDeps } from '@/features/epg/useProgramsInRange';
import { resolvingFetch, streamUrlResolver } from '@/core/net/streamUrl';
import { SharedResource } from '@/core/state/sharedResource';
import { defaultFetch } from './captureContext';
import { captureExtensionOf } from './hlsRecorder';
import { RecordingCenter, type RecordingProgrammes } from './recordingCenter';
import { RecordingEngine } from './recordingEngine';
import { RecordingFiles } from './recordingFiles';
import { RecordingScheduler } from './recordingScheduler';
import { RecordingStore } from './recordingStore';

/** The app-scoped DVR wiring (Android `RecordingLocator`): ONE center shared by every host. */
export interface RecordingRuntime {
  center: RecordingCenter;
  /** Starts the scheduler (shared while any host runs); the returned function stops this host's share. */
  start(): () => void;
}

/** EPG seam: the airing programme's display title + end for instant record, offsets applied. */
export function airingLookup(deps: GuideQueryDeps = defaultGuideDeps): RecordingProgrammes {
  return async (epgId, atMs) => {
    const offsets = offsetsOfMinutes(await deps.channels.epgOffsets());
    const rows = shifted(await deps.programs.airingOrUpcoming([epgId], queryFrom(atMs, offsets)), offsets);
    const now = rows.find((row) => row.startMs <= atMs && row.endMs > atMs);
    return now === undefined ? null : { title: programTitle(now), endMs: now.endMs };
  };
}

export function createRecordingRuntime(clock: () => number = () => Date.now()): RecordingRuntime {
  const store = new RecordingStore(undefined, clock);
  const files = new RecordingFiles();
  // Every capture fetch (raw pipe, HLS playlist, segment, container probe) goes through the Stream & CORS
  // proxy; URL resolution inside HLS playlists stays on the provider's URLs because the rewrite is per request.
  const fetchImpl = resolvingFetch(streamUrlResolver(), defaultFetch);
  const engine = new RecordingEngine({ store, files, clock, fetch: fetchImpl });
  const scheduler = new RecordingScheduler(store, engine, clock);
  const center = new RecordingCenter({
    store,
    engine,
    scheduler,
    files,
    programmes: airingLookup(),
    clock,
    extensionOf: (url) => captureExtensionOf(url, { fetch: fetchImpl }),
  });
  // The scheduler's lifecycle is the core `Shared resource lease` (Free · Starting · Held · Stopping):
  // a host released during the asynchronous recovery sweep cancels the start instead of leaking a
  // second scheduler; a failed sweep is logged, never a crash.
  const ticks = new SharedResource(
    () => center.start(),
    (stopTicks) => stopTicks(),
    (error: unknown) => console.warn('recording runtime failed to start', error),
  );
  return { center, start: () => ticks.acquire().release };
}

export const recordingRuntime: RecordingRuntime = createRecordingRuntime();

/** The DVR facade (Android `ServiceLocator.recordingCenter`). */
export const recordingCenter: RecordingCenter = recordingRuntime.center;

/** Settings → Other → Recording → "Delete all recordings": stops live captures, drops rows + files. */
export function deleteAllRecordings(): Promise<void> {
  return recordingCenter.deleteAll();
}
