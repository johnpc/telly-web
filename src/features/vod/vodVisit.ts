import type { PlayerEngine } from '@/core/player';

/**
 * The lifetime of one VOD visit beside its `VodStage` (both written only by
 * `VodPlaybackViewModel`): Open(watch) · Exited · Released. `watch` is the
 * sampling/persistence loops plus the media-end subscription, null until
 * playback starts; leaving or releasing stops it, so no timer outlives the
 * visit and a released model never loads or pops again.
 */
export interface VodWatch {
  readonly timers: readonly ReturnType<typeof setInterval>[];
  readonly unsubscribe: () => void;
}

export type VodVisit =
  | { readonly kind: 'Open'; readonly watch: VodWatch | null }
  | { readonly kind: 'Exited' }
  | { readonly kind: 'Released' };

export const VISIT: { readonly OPEN: VodVisit; readonly EXITED: VodVisit; readonly RELEASED: VodVisit } = {
  OPEN: { kind: 'Open', watch: null },
  EXITED: { kind: 'Exited' },
  RELEASED: { kind: 'Released' },
};

/** What the loops need: the clock sampler, the periodic persist, and the engine to watch for media end. */
export interface WatchDeps {
  sampleMs: number;
  persistMs: number;
  sample(): void;
  persist(): void;
  engine: Pick<PlayerEngine, 'subscribe' | 'state'>;
  onEnded(): void;
}

/** Starts the sampling + persistence loops and the media-end watcher. */
export function openWatch(deps: WatchDeps): VodWatch {
  const timers = [
    setInterval(() => deps.sample(), deps.sampleMs),
    setInterval(() => deps.persist(), deps.persistMs),
  ];
  const unsubscribe = deps.engine.subscribe(() => {
    if (deps.engine.state.kind === 'Ended') deps.onEnded();
  });
  return { timers, unsubscribe };
}

/** Stops an open visit's loops (a no-op for anything else). */
export function stopWatch(visit: VodVisit): void {
  if (visit.kind !== 'Open' || visit.watch === null) return;
  for (const timer of visit.watch.timers) clearInterval(timer);
  visit.watch.unsubscribe();
}
