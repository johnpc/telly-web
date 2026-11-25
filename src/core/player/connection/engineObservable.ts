// The observable half of the engine: the connection-state store (its ONLY
// writer is `WebPlayerEngine` / `StreamSession` through `store.set`), the
// user-pause flag and the track snapshot, all fanned out through one
// `subscribe` so `useSyncExternalStore` re-reads on any of them.
import { MediaElementEngine } from '../engine/engineMedia';
import { EngineStateStore, type EngineState } from './engineState';
import { NO_TRACKS, type TrackSnapshot } from '../engine/trackModels';

export abstract class ObservableEngine extends MediaElementEngine {
  protected readonly store = new EngineStateStore();
  private readonly listeners = new Set<() => void>();
  private pausedFlag = false;
  private snapshot: TrackSnapshot = NO_TRACKS;

  constructor() {
    super();
    this.store.subscribe(() => {
      this.setDataState(this.state.kind);
      this.emit();
    });
  }

  get state(): EngineState {
    return this.store.get();
  }

  /** True while user-paused; `load` and `stop` reset it. */
  get paused(): boolean {
    return this.pausedFlag;
  }

  get tracks(): TrackSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected setTracks(snapshot: TrackSnapshot): void {
    this.snapshot = snapshot;
    this.emit();
  }

  protected setPaused(value: boolean): void {
    if (this.pausedFlag === value) return;
    this.pausedFlag = value;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
