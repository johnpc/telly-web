import { describe, expect, it, vi } from 'vitest';
import type { ChannelRow } from '@/core/db/types';
import type { PlayerEngine } from '@/core/player';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ChannelZapper } from './channelZapper';
import { PendingCatchup } from './pendingCatchup';
import { LAST_CHANNEL_KEY, TuneController } from './tuneController';

function channel(id: number): ChannelRow {
  return {
    id,
    playlistId: 1,
    number: id,
    sortIndex: id,
    name: `Ch ${id}`,
    groupTitle: 'News',
    logoUrl: null,
    streamUrl: `http://x/${id}.ts`,
    tvgId: `c${id}`,
    favorite: false,
    hidden: false,
    favoriteOrder: 0,
    blocked: false,
    catchupType: null,
    catchupSource: null,
    catchupDays: null,
    customName: null,
    audioDecoder: null,
    videoDecoder: null,
    epgOffsetMinutes: 0,
    externalPlayer: null,
    epgOverride: null,
  };
}
const list = [channel(1), channel(2), channel(3)];

function engineMock(): Pick<PlayerEngine, 'load' | 'stop'> {
  return { load: vi.fn(), stop: vi.fn() };
}

function make(gateBlocks = new Set<number>(), handsOff = false) {
  const engine = engineMock();
  const store = new MemoryKeyValueStore();
  const recordWatch = vi.fn(async () => undefined);
  const tuner = new TuneController({
    engine: engine as unknown as PlayerEngine,
    store,
    recordWatch,
    policies: {
      gate: { intercept: (c) => gateBlocks.has(c.id) },
      external: { handsOff: () => handsOff },
      resolveUrl: (u) => `${u}?proxied`,
    },
  });
  tuner.setChannels(list);
  return { tuner, engine, store, recordWatch };
}

describe('ChannelZapper', () => {
  it('restores the stored channel or falls back to the first', () => {
    expect(ChannelZapper.restore(list, 2)?.id).toBe(2);
    expect(ChannelZapper.restore(list, 99)?.id).toBe(1);
    expect(ChannelZapper.restore([], 1)).toBeNull();
  });
  it('wraps at both ends', () => {
    expect(ChannelZapper.neighbour(list, list[0] ?? null, -1)?.id).toBe(3);
    expect(ChannelZapper.neighbour(list, list[2] ?? null, +1)?.id).toBe(1);
    expect(ChannelZapper.neighbour(list, null, +1)?.id).toBe(1);
    expect(ChannelZapper.neighbour([], null, +1)).toBeNull();
  });
});

describe('PendingCatchup', () => {
  it('replays a stashed url only for the same channel', () => {
    const pending = new PendingCatchup();
    pending.stash(5, 'u');
    expect(pending.consume(6, null)).toBeNull();
    pending.stash(5, 'u');
    expect(pending.consume(5, null)).toBe('u');
    expect(pending.consume(5, null)).toBeNull();
    pending.stash(5, 'u');
    expect(pending.consume(5, 'explicit')).toBe('explicit');
  });
});

describe('TuneController', () => {
  it('starts on the stored channel and records a watch', () => {
    const { tuner, engine, store, recordWatch } = make();
    store.set(LAST_CHANNEL_KEY, '2');
    tuner.start();
    expect(tuner.playing).toEqual({ kind: 'Live', channel: list[1] });
    expect(engine.load).toHaveBeenCalledWith('http://x/2.ts?proxied', { live: true });
    expect(recordWatch).toHaveBeenCalledWith(list[1]);
    tuner.start();
    expect(engine.load).toHaveBeenCalledTimes(1);
  });
  it('starts on channel 1 when nothing is stored, and resumeStored resumes nothing', () => {
    const { tuner, engine } = make();
    tuner.resumeStored();
    expect(engine.load).not.toHaveBeenCalled();
    tuner.start();
    expect(tuner.current?.id).toBe(1);
  });
  it('zaps with wrap-around and persists the last channel', () => {
    const { tuner, store } = make();
    tuner.start();
    expect(tuner.zap(-1)).toBe(true);
    expect(tuner.current?.id).toBe(3);
    expect(store.get(LAST_CHANNEL_KEY)).toBe('3');
  });
  it('a gated tune changes nothing and stashes the archive for the PIN replay', () => {
    const { tuner } = make(new Set([2]));
    tuner.start();
    tuner.tune(list[1] as ChannelRow, { catchupUrl: 'http://x/arch' });
    expect(tuner.current?.id).toBe(1);
    expect(tuner.zap(+1)).toBe(false);
    const open = make();
    open.tuner.start();
    open.tuner.tune(list[1] as ChannelRow, { catchupUrl: 'http://x/arch' });
    expect(open.tuner.playing).toEqual({ kind: 'Archive', channel: list[1], url: 'http://x/arch' });
    expect(open.engine.load).toHaveBeenLastCalledWith('http://x/arch', { live: false });
    expect(open.recordWatch).toHaveBeenCalledTimes(1);
  });
  it('hands off to the external player only for user tunes', () => {
    const { tuner, engine } = make(new Set(), true);
    tuner.start();
    expect(tuner.playing?.kind).toBe('Live');
    tuner.tune(list[2] as ChannelRow);
    expect(tuner.playing?.kind).toBe('External');
    expect(engine.stop).toHaveBeenCalled();
  });
  it('retunes the current channel and zaps away from a vanishing one', () => {
    const { tuner, engine } = make();
    tuner.start();
    tuner.retune();
    expect(engine.load).toHaveBeenCalledTimes(2);
    tuner.zapAwayFrom(list[2] as ChannelRow);
    expect(tuner.current?.id).toBe(1);
    tuner.zapAwayFrom(list[0] as ChannelRow);
    expect(tuner.current?.id).toBe(2);
    expect(tuner.byId(3)?.id).toBe(3);
    expect(tuner.byId(9)).toBeNull();
  });
});
