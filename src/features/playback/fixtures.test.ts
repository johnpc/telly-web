import { describe, expect, it, vi } from 'vitest';
import type { ChannelRow, ProgramRow } from '@/core/db/types';
import type { PlayerEngine } from '@/core/player';
import { NO_TRACKS } from '@/core/player';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { TuneController } from './tune/tuneController';
import type { TunePolicies } from './tune/tunePolicies';

/** Shared fixtures for the playback slice's unit tests (exempt from the logic-file gates). */
export function channel(id: number, overrides: Partial<ChannelRow> = {}): ChannelRow {
  return {
    id,
    playlistId: 1,
    number: id,
    sortIndex: id,
    name: `Channel ${id}`,
    groupTitle: 'News',
    logoUrl: `http://x/${id}.png`,
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
    ...overrides,
  };
}

export function program(tvgId: string, startMs: number, endMs: number, title = 'Show'): ProgramRow {
  return {
    id: startMs,
    channelTvgId: tvgId,
    startMs,
    endMs,
    title,
    subTitle: null,
    description: null,
    category: null,
    episode: null,
  };
}

export const UTC = { is24h: false, timeZone: 'UTC' } as const;

export interface FakeEngine extends PlayerEngine {
  emit(): void;
}

/** A `PlayerEngine` double: every write is a spy, `emit` fires the subscribers. */
export function fakeEngine(): FakeEngine {
  const listeners = new Set<() => void>();
  const video = document.createElement('video');
  const engine = {
    state: { kind: 'Idle' },
    paused: false,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    attach: vi.fn(),
    video,
    moveVideoTo: vi.fn(),
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    release: vi.fn(),
    seekTo: vi.fn(),
    positionMs: 0,
    durationMs: 0,
    buffered: [],
    tracks: NO_TRACKS,
    selectVideoTrack: vi.fn(),
    selectAudioTrack: vi.fn(),
    selectTextTrack: vi.fn(),
    audioSyncMs: 0,
    audioSyncSupport: 'delay-only',
    volume: 1,
    muted: false,
    resizeMode: 'Fit',
    streamDetails: vi.fn(() => ({ width: 1280, height: 720, frameRate: 25, audioChannels: 1 })),
    emit: () => listeners.forEach((l) => l()),
  } satisfies FakeEngine;
  return engine;
}

export function tunerOver(
  engine: PlayerEngine,
  channels: ChannelRow[],
  policies: Partial<TunePolicies> = {},
): TuneController {
  const tuner = new TuneController({
    engine,
    store: new MemoryKeyValueStore(),
    recordWatch: async () => undefined,
    policies,
  });
  tuner.setChannels(channels);
  return tuner;
}

describe('fixtures', () => {
  it('build rows with overrides', () => {
    expect(channel(3, { name: 'X' })).toMatchObject({ id: 3, number: 3, name: 'X' });
    expect(program('a', 0, 1).channelTvgId).toBe('a');
    expect(fakeEngine().streamDetails().width).toBe(1280);
  });
});
