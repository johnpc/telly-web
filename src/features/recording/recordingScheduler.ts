import type { RecordingRow } from '@/core/db/types';
import type { RecordingEngine } from './recordingEngine';
import type { RecordingStore } from './recordingStore';
import { failMissed } from './recordingStoreTransitions';
import { type RecordingTickerDeps, defaultRecordingTickerDeps, startRecordingTicks } from './recordingTicker';

/**
 * The in-app scheduler (Android `RecordingScheduler`): re-sweeps the
 * SCHEDULED rows on every tick AND on every change to the recordings table,
 * starting captures whose time has come and failing entries whose whole
 * window was missed. There are no alarm wakeups — scheduled recordings only
 * start while the tab is open, which the settings pane says out loud.
 */
export class RecordingScheduler {
  constructor(
    private readonly store: RecordingStore,
    private readonly engine: RecordingEngine,
    private readonly clock: () => number,
    private readonly ticker: RecordingTickerDeps = defaultRecordingTickerDeps,
  ) {}

  /** Starts the ticks; the returned function stops them. */
  start(): () => void {
    return startRecordingTicks(
      () => this.tick(),
      (rows) => this.sweep(rows),
      this.ticker,
    );
  }

  async tick(): Promise<void> {
    await this.sweep(await this.store.scheduled());
  }

  async sweep(due: readonly RecordingRow[]): Promise<void> {
    const now = this.clock();
    for (const entry of due) {
      if (entry.plannedEndMs <= now) await failMissed(this.store, entry.id);
      else if (entry.startMs <= now && !this.engine.isActive(entry.id)) this.engine.start(entry);
    }
  }
}
