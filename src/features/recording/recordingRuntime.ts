import { programTitle } from '@/features/epg/nowNext';
import { offsetsOfMinutes, queryFrom, shifted } from '@/features/epg/epgOffsets';
import { type GuideQueryDeps, defaultGuideDeps } from '@/features/epg/useProgramsInRange';
import { SharedTicks } from '@/features/reminders/remindersHub';
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
  const engine = new RecordingEngine({ store, files, clock });
  const scheduler = new RecordingScheduler(store, engine, clock);
  const center = new RecordingCenter({
    store,
    engine,
    scheduler,
    files,
    programmes: airingLookup(),
    clock,
    extensionOf: (url) => captureExtensionOf(url, { fetch: defaultFetch }),
  });
  // A failed recovery sweep is logged, never a crash; the schedule is watched regardless.
  const ticks = new SharedTicks(() => {
    let stop: (() => void) | null = null;
    center.start().then(
      (stopTicks) => (stop = stopTicks),
      (error: unknown) => console.warn('recording runtime failed to start', error),
    );
    return () => stop?.();
  });
  return { center, start: ticks.start };
}

export const recordingRuntime: RecordingRuntime = createRecordingRuntime();

/** The DVR facade (Android `ServiceLocator.recordingCenter`). */
export const recordingCenter: RecordingCenter = recordingRuntime.center;

/** Settings → Other → Recording → "Delete all recordings": stops live captures, drops rows + files. */
export function deleteAllRecordings(): Promise<void> {
  return recordingCenter.deleteAll();
}
