import { describe, expect, it, vi } from 'vitest';
import type { ChannelRow } from '@/core/db/types';
import { tellyDb } from '@/core/db/tellyDb';
import { watchHistoryRepository } from '@/core/db/watchHistoryRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import type { PlayerEngine } from '@/core/player';
import { SharedPlayerEngine } from '@/core/player';
import { HISTORY_CAP, createPlaybackDeps } from './playbackDeps';

const channel = { id: 7, name: 'A', streamUrl: 'http://x/a.ts', tvgId: 'a' } as ChannelRow;

describe('createPlaybackDeps', () => {
  it('builds controllers that share one tuned state and record watch history by identity key', async () => {
    await tellyDb.watch_history.clear();
    const engine = { load: vi.fn(), stop: vi.fn(), release: vi.fn() } as unknown as PlayerEngine;
    const deps = createPlaybackDeps({ store: new MemoryKeyValueStore() });
    const a = deps.controllerFor(engine);
    const b = deps.controllerFor(engine);
    a.setChannels([channel]);
    a.tune(channel);
    expect(b.current?.id).toBe(7);
    expect(deps.tunedState.playing?.kind).toBe('Live');
    await vi.waitFor(async () => expect((await watchHistoryRepository.events()).length).toBe(1));
    expect((await watchHistoryRepository.events())[0]?.channelKey).toBe('a');
    expect(HISTORY_CAP).toBe(30);
    expect(await deps.channels()).toEqual([]);
  });
  it('accepts an injected shared engine and policies', () => {
    const shared = new SharedPlayerEngine(() => ({ release: vi.fn() }));
    const deps = createPlaybackDeps({
      shared: shared as never,
      policies: { resolveUrl: (u) => `${u}#p` },
      recordWatch: async () => undefined,
    });
    expect(deps.shared).toBe(shared);
    const engine = { load: vi.fn(), stop: vi.fn() } as unknown as PlayerEngine;
    const tuner = deps.controllerFor(engine);
    tuner.setChannels([channel]);
    tuner.tune(channel);
    expect(engine.load).toHaveBeenCalledWith('http://x/a.ts#p', { live: true });
  });
});
