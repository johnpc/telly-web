import { useEffect, useState } from 'react';
import type { PlayerEngine, StreamDetails } from '@/core/player';

export const DETAILS_POLL_MS = 1_000;

function same(a: StreamDetails | null, b: StreamDetails): boolean {
  return (
    a !== null &&
    a.width === b.width &&
    a.height === b.height &&
    a.frameRate === b.frameRate &&
    a.audioChannels === b.audioChannels
  );
}

type Sampler = (update: (previous: StreamDetails | null) => StreamDetails | null) => void;

/** One sampling step: keep the previous object while nothing changed so React skips the re-render. */
function sampleInto(engine: Pick<PlayerEngine, 'streamDetails'>, set: Sampler): void {
  const next = engine.streamDetails();
  set((previous) => (same(previous, next) ? previous : next));
}

/**
 * The engine's probed stream facts (resolution / fps / channels) as React
 * state. The engine announces state and track changes but fills these in
 * lazily (READY, MEDIA_INFO, the frame-rate estimate), so while an overlay
 * shows them they are sampled once a second on top of every engine event.
 */
export function useStreamDetails(engine: PlayerEngine, active: boolean): StreamDetails | null {
  const [details, setDetails] = useState<StreamDetails | null>(null);
  useEffect(() => {
    const sample = (): void => sampleInto(engine, setDetails);
    sample();
    const unsubscribe = engine.subscribe(sample);
    const timer = active ? setInterval(sample, DETAILS_POLL_MS) : null;
    return () => {
      unsubscribe();
      if (timer !== null) clearInterval(timer);
    };
  }, [engine, active]);
  return details;
}
