import { useSyncExternalStore } from 'react';
import type { PlayerEngine, StreamDetails } from '@/core/player';
import type { Signal } from '../overlay/signal';
import { useSignal } from '../usePlaybackStores';
import type { TrackSource } from './trackPickerRows';

/** The engine's live track snapshot + audio-sync offset, re-read on every engine event and `changed` tick. */
export function useTrackSource(
  engine: PlayerEngine,
  details: StreamDetails | null,
  changed: Signal,
): TrackSource {
  useSignal(changed);
  const tracks = useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.tracks,
    () => engine.tracks,
  );
  return { tracks, details, audioSyncMs: engine.audioSyncMs };
}
