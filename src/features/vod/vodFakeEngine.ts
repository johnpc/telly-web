import type { EngineState, PlayerEngine } from '@/core/player';
import { NO_TRACKS } from '@/core/player';

/** A mutable `PlayerEngine` double for the VOD tests: writes are recorded, readings are plain fields. */
export interface FakeVodEngine extends PlayerEngine {
  state: EngineState;
  paused: boolean;
  positionMs: number;
  durationMs: number;
  calls: string[];
  setState(state: EngineState): void;
}

export function fakeVodEngine(): FakeVodEngine {
  const listeners = new Set<() => void>();
  const noop = (): void => undefined;
  const record = (call: string): number => engine.calls.push(call);
  const engine: FakeVodEngine = {
    state: { kind: 'Idle' },
    paused: false,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach: noop,
    video: null,
    moveVideoTo: noop,
    load: (url, options) => {
      engine.paused = false;
      record(`load:${url}@${options.startPositionMs ?? 0}`);
    },
    play: () => {
      engine.paused = false;
      record('play');
    },
    pause: () => {
      engine.paused = true;
      record('pause');
    },
    stop: () => {
      engine.paused = false;
      record('stop');
    },
    release: () => record('release'),
    seekTo: (positionMs) => {
      engine.positionMs = positionMs;
      record(`seek:${positionMs}`);
    },
    positionMs: 0,
    durationMs: 0,
    buffered: [],
    tracks: NO_TRACKS,
    selectVideoTrack: noop,
    selectAudioTrack: noop,
    selectTextTrack: noop,
    audioSyncMs: 0,
    audioSyncSupport: 'unsupported',
    volume: 1,
    muted: false,
    resizeMode: 'Fit',
    streamDetails: () => ({ width: 0, height: 0, frameRate: 0, audioChannels: 0 }),
    calls: [],
    setState: (state) => {
      engine.state = state;
      for (const listener of listeners) listener();
    },
  };
  return engine;
}
