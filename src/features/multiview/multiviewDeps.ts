import { channelRepository } from '@/core/db/channelRepository';
import type { ChannelRow } from '@/core/db/types';
import type { KeyValueStore } from '@/core/kv/keyValueStore';
import { streamUrlResolver } from '@/core/net/streamUrl';
import { createEngine, createVideoElement, type PlayerEngine } from '@/core/player';
import type { BlockGate } from '@/features/playback/gate/blockGate';
import { playbackGate } from '@/features/playback/gate/playbackGate';
import { playbackDeps } from '@/features/playback/tune';
import { MultiviewPanes } from './multiviewPanes';
import { MultiviewTuneGate } from './multiviewTuneGate';
import { MultiviewViewModel } from './multiviewViewModel';

/**
 * Everything multiview needs from the composition root (Android
 * `MultiviewDeps` + `MultiviewTune`): an engine factory yielding one
 * independent player per pane, the blocked-channel gate shared with the
 * playback and guide tuners (same `BlockSession` relock semantics), the
 * `lastChannelId` store and the live channel list.
 */
export interface MultiviewDeps {
  engines: () => PlayerEngine;
  gate: BlockGate;
  store: KeyValueStore;
  channels: () => Promise<ChannelRow[]>;
  /** Stream-URL resolution applied at pane tunes (the Stream & CORS proxy, read live per tune). */
  resolveUrl: (url: string) => string;
}

/** A pane engine with its own `<video>` — never the shared live lease. */
export function createPaneEngine(): PlayerEngine {
  const engine = createEngine();
  engine.attach(createVideoElement());
  return engine;
}

export const multiviewDeps: MultiviewDeps = {
  engines: createPaneEngine,
  gate: playbackGate.gate,
  store: playbackDeps.store,
  channels: () => channelRepository.visible(),
  resolveUrl: streamUrlResolver(),
};

export function createMultiviewViewModel(deps: MultiviewDeps, onExit: () => void): MultiviewViewModel {
  return new MultiviewViewModel({
    panes: new MultiviewPanes(deps.engines, deps.resolveUrl),
    gate: new MultiviewTuneGate(deps.gate),
    store: deps.store,
    onExit,
  });
}
