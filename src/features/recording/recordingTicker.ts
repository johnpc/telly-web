import { liveQuery } from 'dexie';
import { type TellyDb, tellyDb } from '@/core/db/tellyDb';
import type { RecordingRow } from '@/core/db/types';

/** The scheduler's cadence while the tab is visible. */
export const RECORDING_TICK_MS = 15_000;

type VisibilitySurface = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;

export interface RecordingTickerDeps {
  db: TellyDb;
  intervalMs: number;
  /** `document` surface the ticker reads; null (tests) means always visible. */
  visibility: VisibilitySurface | null;
}

export const defaultRecordingTickerDeps: RecordingTickerDeps = {
  db: tellyDb,
  intervalMs: RECORDING_TICK_MS,
  visibility: typeof document === 'undefined' ? null : document,
};

function visible(deps: RecordingTickerDeps): boolean {
  return deps.visibility === null || deps.visibility.visibilityState === 'visible';
}

/**
 * The web-side ticks for the recording scheduler: a ~15 s interval while the
 * tab is visible (hidden tabs throttle timers anyway), an immediate sweep
 * when the tab comes back, and a sweep whenever the SCHEDULED rows change.
 */
export function startRecordingTicks(
  onTick: () => Promise<void>,
  onRows: (rows: RecordingRow[]) => Promise<void>,
  deps: RecordingTickerDeps = defaultRecordingTickerDeps,
): () => void {
  const tick = (): void => {
    if (visible(deps)) void onTick();
  };
  const timer = setInterval(tick, deps.intervalMs);
  const scheduled = liveQuery(() => deps.db.recordings.where('status').equals('SCHEDULED').toArray());
  const subscription = scheduled.subscribe({
    next: (rows) => {
      if (visible(deps)) void onRows(rows);
    },
    error: (error: unknown) => console.error('recordings live query failed', error),
  });
  deps.visibility?.addEventListener('visibilitychange', tick);
  return () => {
    clearInterval(timer);
    subscription.unsubscribe();
    deps.visibility?.removeEventListener('visibilitychange', tick);
  };
}
