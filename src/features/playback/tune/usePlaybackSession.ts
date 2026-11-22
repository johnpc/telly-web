import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ChannelRow } from '@/core/db/types';
import { type PlayerEngine, useLeasedEngine } from '@/core/player';
import { type PlaybackDeps, playbackDeps } from './playbackDeps';
import type { TuneController } from './tuneController';
import type { TunedStream } from './tunedStream';

export interface PlaybackSession {
  engine: PlayerEngine;
  tuner: TuneController;
  channels: readonly ChannelRow[];
  playing: TunedStream | null;
}

/**
 * Leases the shared live engine for the component's lifetime and gives it a
 * `TuneController` fed by the live channel list. Both the guide preview and
 * fullscreen playback call this, so the stream survives the route change.
 * Null until the engine lease and the first channel query resolve.
 */
export function usePlaybackSession(deps: PlaybackDeps = playbackDeps): PlaybackSession | null {
  const engine = useLeasedEngine(deps.shared);
  const channels = useLiveQuery(() => deps.channels(), [deps]);
  const tuner = useTuner(deps, engine);
  useChannelFeed(tuner, channels);
  const playing = useTunedStream(deps);
  return sessionOf(engine, tuner, channels, playing);
}

function sessionOf(
  engine: PlayerEngine | null,
  tuner: TuneController | null,
  channels: readonly ChannelRow[] | undefined,
  playing: TunedStream | null,
): PlaybackSession | null {
  if (engine === null || tuner === null || channels === undefined) return null;
  return { engine, tuner, channels, playing };
}

function useTuner(deps: PlaybackDeps, engine: PlayerEngine | null): TuneController | null {
  return useMemo(() => (engine === null ? null : deps.controllerFor(engine)), [engine, deps]);
}

function useChannelFeed(tuner: TuneController | null, channels: readonly ChannelRow[] | undefined): void {
  useEffect(() => {
    if (channels !== undefined) tuner?.setChannels(channels);
  }, [tuner, channels]);
}

/** The app-wide tuned mode as React state. */
export function useTunedStream(deps: PlaybackDeps = playbackDeps): TunedStream | null {
  const subscribe = (listener: () => void): (() => void) => deps.tunedState.subscribe(listener);
  return useSyncExternalStore(
    subscribe,
    () => deps.tunedState.playing,
    () => null,
  );
}
