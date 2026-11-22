import { keyOf } from '@/core/db/channelIdentity';
import { channelRepository } from '@/core/db/channelRepository';
import type { ChannelRow } from '@/core/db/types';
import { watchHistoryRepository } from '@/core/db/watchHistoryRepository';
import { LocalStorageKeyValueStore } from '@/core/kv/localStorageKeyValueStore';
import {
  type PlayerEngine,
  type SharedPlayerEngine,
  type WebPlayerEngine,
  createSharedEngine,
} from '@/core/player';
import { PendingCatchup } from './pendingCatchup';
import { TuneController, type TuneControllerDeps } from './tuneController';
import type { TunePolicies } from './tunePolicies';
import { TunedStreamState } from './tunedStream';

/**
 * Android `PlaybackDeps`: ONE shared live engine (refcounted lease), ONE
 * app-wide tuned-stream state, and a `TuneController` per leased engine.
 * The guide preview and fullscreen playback hand the same stream over.
 */
/** Android `WatchHistory.CAP`. */
export const HISTORY_CAP = 30;

export interface PlaybackDeps {
  shared: SharedPlayerEngine<WebPlayerEngine>;
  tunedState: TunedStreamState;
  pendingCatchup: PendingCatchup;
  policies: Partial<TunePolicies>;
  controllerFor(engine: PlayerEngine): TuneController;
  channels(): Promise<ChannelRow[]>;
}

export function createPlaybackDeps(
  overrides: Partial<Pick<PlaybackDeps, 'shared' | 'policies'>> &
    Partial<Pick<TuneControllerDeps, 'store' | 'recordWatch'>> = {},
): PlaybackDeps {
  const tunedState = new TunedStreamState();
  const pendingCatchup = new PendingCatchup();
  const store = overrides.store ?? new LocalStorageKeyValueStore();
  const recordWatch =
    overrides.recordWatch ??
    ((channel: ChannelRow): Promise<void> =>
      watchHistoryRepository
        .upsert({ channelKey: keyOf(channel), watchedAtMs: Date.now() })
        .then(() => watchHistoryRepository.trimTo(HISTORY_CAP)));
  const policies = overrides.policies ?? {};
  return {
    shared: overrides.shared ?? createSharedEngine(),
    tunedState,
    pendingCatchup,
    policies,
    controllerFor: (engine) =>
      new TuneController({ engine, store, recordWatch, policies, state: tunedState, pendingCatchup }),
    channels: () => channelRepository.visible(),
  };
}

export const playbackDeps: PlaybackDeps = createPlaybackDeps();
