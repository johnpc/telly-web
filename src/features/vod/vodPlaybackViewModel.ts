import type { VodItemRow } from '@/core/db/types';
import type { PlayerEngine } from '@/core/player';
import { Observable } from '@/features/guide/observable';
import type { VodDeps } from './vodDeps';
import { VodPlayerControls } from './vodPlayerControls';
import { VodPositionStore } from './vodPositionStore';
import { offerResume } from './vodResumePolicy';
import { resumePrompt, VOD_LOADING, VOD_PLAYING, type VodStage } from './vodStage';
import { VodTransportVisibility } from './vodTransportVisibility';

const SAMPLE_MS = 500;
const PERSIST_MS = 10_000;

/**
 * VOD playback (ux-spec §VOD, Android `VodPlaybackViewModel`): loads the
 * item, offers Resume/Start-over when a stored position sits inside the
 * resume band, and persists the position on pause/exit and every ~10 s.
 * Transport keys live in `vodPlaybackKeys.ts`. The sole writer of `VodStage`.
 */
export class VodPlaybackViewModel extends Observable {
  readonly engine: PlayerEngine;
  readonly controls: VodPlayerControls;
  private readonly store: VodPositionStore;
  private loaded: VodItemRow | null = null;
  private current: VodStage = VOD_LOADING;
  private timers: ReturnType<typeof setInterval>[] = [];
  private unsubscribeEngine: () => void = () => undefined;
  private exited = false;
  private released = false;

  constructor(
    private readonly deps: VodDeps,
    private readonly itemKey: string,
    private readonly onExit: () => void,
  ) {
    super();
    this.engine = deps.engineFactory();
    this.store = new VodPositionStore(deps.positions, deps.rememberPosition, deps.clock);
    const transport = new VodTransportVisibility(deps.transportTimeoutMs);
    this.controls = new VodPlayerControls(this.engine, transport, () => void this.persist());
    this.controls.subscribe(() => this.notify());
    transport.subscribe(() => this.notify());
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
    if (this.current.kind === 'Playing') await this.persist();
    this.leave();
  }

  /** Tears the visit down; a released ViewModel never loads or pops again. */
  release(): void {
    this.released = true;
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
    this.unsubscribeEngine();
    this.controls.transport.dispose();
    this.engine.release();
  }

  private play(fromMs: number): void {
    if (this.loaded === null || this.exited || this.released) return;
    this.setStage(VOD_PLAYING);
    this.engine.load(this.loaded.streamUrl, { live: false, startPositionMs: fromMs });
    this.controls.begin();
    this.watch();
  }

  /** Sampling + persistence loops and the media-end watcher. */
  private watch(): void {
    if (this.timers.length > 0) return;
    this.timers = [
      setInterval(() => this.controls.sample(), SAMPLE_MS),
      setInterval(() => void this.persist(), PERSIST_MS),
    ];
    // Media end: the position row clears as finished and the route exits.
    this.unsubscribeEngine = this.engine.subscribe(() => {
      if (this.engine.state.kind !== 'Ended') return;
      void this.store.finish(this.itemKey, this.controls.durationMs()).then(() => this.leave());
    });
  }

  private persist(): Promise<void> {
    return this.store.save(this.itemKey, this.controls.positionMs(), this.controls.durationMs());
  }

  private setStage(stage: VodStage): void {
    this.current = stage;
    this.notify();
  }

  private leave(): void {
    if (this.exited || this.released) return;
    this.exited = true;
    this.onExit();
  }
}
