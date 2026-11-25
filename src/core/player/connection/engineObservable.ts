// The observable half of the engine: the connection-state store (its ONLY
// writer is `WebPlayerEngine` / `StreamSession` through `store.set`), the
// user-pause flag, the track snapshot, the buffer gate's runway and the zap
// frame hold, all fanned out through one `subscribe` so
// `useSyncExternalStore` re-reads on any of them.
import { MediaElementEngine } from '../engine/engineMedia';
import { EngineStateStore, type EngineState } from './engineState';
import { NO_TRACKS, type TrackSnapshot } from '../engine/trackModels';
import { type RunwayProgress, RunwayStore } from '../gate/runwayProgress';
import { FrameHold, type HeldFrame } from '../video/frameHold';

export abstract class ObservableEngine extends MediaElementEngine {
  protected readonly store = new EngineStateStore();
  /** Written only by the tune's `BufferGate`; the engine hands it to every transport. */
  protected readonly runwayStore = new RunwayStore();
  /** Captured by `StreamSession` before a tune; cleared by the connection state leaving Buffering / Reconnecting. */
  protected readonly frames = new FrameHold();
  private readonly listeners = new Set<() => void>();
  private pausedFlag = false;
  private snapshot: TrackSnapshot = NO_TRACKS;

  constructor() {
    super();
    this.store.subscribe(() => {
      this.setDataState(this.state.kind);
      this.emit();
    });
    this.runwayStore.subscribe(() => this.emit());
    this.frames.follow(this.store);
    this.frames.subscribe(() => this.emit());
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

  get runway(): RunwayProgress {
    return this.runwayStore.get();
  }

  get heldFrame(): HeldFrame {
    return this.frames.current;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** The held-frame canvas travels with the `<video>` (same host, stacked on top). */
  override moveVideoTo(container: Element): void {
    super.moveVideoTo(container);
    this.frames.moveTo(container);
  }

  protected override detachElement(): void {
    super.detachElement();
    this.frames.remove();
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
