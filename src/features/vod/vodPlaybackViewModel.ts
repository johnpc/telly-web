import type { VodItemRow } from '@/core/db/types';
import type { PlayerEngine } from '@/core/player';
import { Observable } from '@/core/state/observable';
import type { VodDeps } from './vodDeps';
import { createVodControls, type VodPlayerControls } from './vodPlayerControls';
import { VodPositionStore } from './vodPositionStore';
import { offerResume } from './vodResumePolicy';
import { resumePrompt, VOD_LOADING, VOD_PLAYING, type VodStage } from './vodStage';
import { VISIT, type VodVisit, openWatch, stopWatch } from './vodVisit';

const SAMPLE_MS = 500;
const PERSIST_MS = 10_000;

/**
 * VOD playback (ux-spec §VOD, Android `VodPlaybackViewModel`): loads the
 * item, offers Resume/Start-over when a stored position sits inside the
 * resume band, and persists the position on pause/exit and every ~10 s.
 * Transport keys live in `vodPlaybackKeys.ts`. The sole writer of `VodStage`
 * and of the visit's `VodVisit` lifetime.
 */
export class VodPlaybackViewModel extends Observable {
  readonly engine: PlayerEngine;
  readonly controls: VodPlayerControls;
  private readonly store: VodPositionStore;
  private loaded: VodItemRow | null = null;
  private current: VodStage = VOD_LOADING;
  private visit: VodVisit = VISIT.OPEN;

  constructor(
    private readonly deps: VodDeps,
    private readonly itemKey: string,
    private readonly onExit: () => void,
  ) {
    super();
    this.engine = deps.engineFactory();
    this.store = new VodPositionStore(deps.positions, deps.rememberPosition, deps.clock);
    this.controls = createVodControls(this.engine, deps.transportTimeoutMs, {
      persistOnPause: () => void this.persist(),
      active: () => this.current.kind === 'Playing',
      changed: () => this.notify(),
    });
  }

  get item(): VodItemRow | null {
    return this.loaded;
  }

  get stage(): VodStage {
    return this.current;
  }

  /** Loads the item; a vanished key just leaves the route. */
  async start(): Promise<void> {
    const loaded = await this.deps.items.itemByKey(this.itemKey);
    if (loaded === null) return this.leave();
    this.loaded = loaded;
    const stored = await this.store.read(this.itemKey);
    if (stored !== null && offerResume(stored.positionMs, stored.durationMs)) {
      this.setStage(resumePrompt(stored.positionMs));
    } else {
      this.play(0);
    }
  }

  resumeStored(): void {
    this.play(this.current.kind === 'ResumePrompt' ? this.current.positionMs : 0);
  }

  startOver(): void {
    this.play(0);
  }

  /** BACK: persist the position (playing only), then pop the route. */
  async exit(): Promise<void> {
    if (this.current.kind === 'Playing' && this.visit.kind === 'Open') await this.persist();
    this.leave();
  }

  /** Tears the visit down; a released ViewModel never loads or pops again. */
  release(): void {
    stopWatch(this.visit);
    this.visit = VISIT.RELEASED;
    this.controls.transport.dispose();
    this.engine.release();
  }

  private play(fromMs: number): void {
    if (this.loaded === null || this.visit.kind !== 'Open') return;
    this.setStage(VOD_PLAYING);
    this.engine.load(this.deps.resolveUrl(this.loaded.streamUrl), { live: false, startPositionMs: fromMs });
    this.controls.reveal();
    if (this.visit.watch === null) this.visit = this.watch();
  }

  /** Media end: the position row clears as finished and the route exits. */
  private watch(): VodVisit {
    const watch = openWatch({
      sampleMs: SAMPLE_MS,
      persistMs: PERSIST_MS,
      sample: () => this.controls.sample(),
      persist: () => void this.persist(),
      engine: this.engine,
      onEnded: () =>
        void this.store.finish(this.itemKey, this.controls.durationMs()).then(() => this.leave()),
    });
    return { kind: 'Open', watch };
  }

  private persist(): Promise<void> {
    return this.store.save(this.itemKey, this.controls.positionMs(), this.controls.durationMs());
  }

  private setStage(stage: VodStage): void {
    this.current = stage;
    this.notify();
  }

  /** The visit ends: its loops stop with it, then the route pops once. */
  private leave(): void {
    if (this.visit.kind !== 'Open') return;
    stopWatch(this.visit);
    this.visit = VISIT.EXITED;
    this.onExit();
  }
}
