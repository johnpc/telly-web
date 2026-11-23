import { describe, expect, it, vi } from 'vitest';
import type { ProgramRow } from '@/core/db/types';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import type { EngineState, PlayerEngine } from '@/core/player';
import { TuneController } from '@/features/playback/tune';
import { ArmedArchive, activeFor } from './catchupArmed';
import type { CatchupEpg } from './catchupEpg';
import { CatchupPlayback } from './catchupPlayback';
import { CatchupSession } from './catchupSession';
import { DEFAULT_SEEK_KEYS } from './catchupKeyPolicy';
import { DEFAULT_SKIP } from './skipSteps';
import { HOUR, NOW, channelRow, programRow, request } from './testFixtures';
import { NO_SEEK } from './catchupSession';

class FakeEngine {
  positionMs = 0;
  paused = false;
  state: EngineState = { kind: 'Idle' };
  private readonly listeners = new Set<() => void>();
  load = vi.fn(() => {
    this.paused = false;
  });
  stop = vi.fn();
  seekTo = vi.fn((ms: number) => (this.positionMs = ms));
  pause = vi.fn(() => (this.paused = true));
  play = vi.fn(() => (this.paused = false));
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  setState(state: EngineState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}

const channel = channelRow(1);
const other = channelRow(2, { catchupType: null, catchupSource: null });
const programmes: ProgramRow[] = [
  programRow('c1', NOW - 3 * HOUR, NOW - 2 * HOUR, 'B'),
  programRow('c1', NOW - 2 * HOUR, NOW - HOUR, 'C'),
  programRow('c1', NOW - HOUR, NOW + HOUR, 'Airing'),
];
const memoryEpg: CatchupEpg = {
  programmesFor: async (ch, from, to) =>
    ch.tvgId === 'c1' ? programmes.filter((p) => p.endMs > from && p.startMs < to) : [],
  airingAt: async (ch, at) =>
    ch.tvgId === 'c1' ? (programmes.find((p) => p.startMs <= at && at < p.endMs) ?? null) : null,
};

function make(gated = false) {
  const engine = new FakeEngine();
  const tuner = new TuneController({
    engine: engine as unknown as PlayerEngine,
    store: new MemoryKeyValueStore(),
    recordWatch: async () => undefined,
    policies: { gate: { intercept: () => gated } },
  });
  tuner.setChannels([channel, other]);
  const session = new CatchupSession();
  const seams = { showTransport: vi.fn(), pinTransport: vi.fn(), exitToGuide: vi.fn() };
  const catchup = new CatchupPlayback({
    engine,
    tuner,
    session,
    epg: memoryEpg,
    seekKeys: () => DEFAULT_SEEK_KEYS,
    skip: () => DEFAULT_SKIP,
    ...seams,
    clock: () => NOW,
  });
  return { engine, tuner, session, seams, catchup };
}
const yesterday = request(channel, NOW - 2 * HOUR, NOW - HOUR, 'C');

describe('activeFor / ArmedArchive', () => {
  it('is on exactly while the tuner plays the armed archive url', () => {
    const state = { request: yesterday, fromLive: false, seek: NO_SEEK };
    expect(activeFor(null, state)).toBeNull();
    expect(activeFor({ kind: 'Live', channel }, state)).toBeNull();
    expect(activeFor({ kind: 'Archive', channel, url: 'other' }, state)).toBeNull();
    expect(activeFor({ kind: 'Archive', channel, url: yesterday.url }, state)).toBe(state);
    expect(activeFor({ kind: 'Archive', channel, url: yesterday.url }, null)).toBeNull();
    const armed = new ArmedArchive();
    const stream = { kind: 'Archive' as const, channel, url: yesterday.url };
    armed.arm(state);
    expect(armed.activeIn(stream)).toBe(state);
    expect(armed.activeIn(stream)).toBe(armed.activeIn(stream));
  });
});

describe('CatchupPlayback', () => {
  it('consumes the pending request, arms the archive tune and shows the transport', () => {
    const { catchup, session, tuner, seams, engine } = make();
    expect(catchup.resumePending()).toBe(false);
    session.set(yesterday);
    expect(catchup.resumePending()).toBe(true);
    expect(tuner.playing).toEqual({ kind: 'Archive', channel, url: yesterday.url });
    expect(engine.load).toHaveBeenLastCalledWith(yesterday.url, { live: false });
    expect(catchup.state).toEqual({ request: yesterday, fromLive: false, seek: NO_SEEK });
    expect(seams.showTransport).toHaveBeenCalledTimes(1);
    expect(catchup.skip()).toBe(DEFAULT_SKIP);
  });
  it('is derived: a gated tune is not catch-up, and ANY live tune leaves the mode', () => {
    const gated = make(true);
    gated.catchup.enter(yesterday, false);
    expect(gated.catchup.state).toBeNull();
    const { catchup, tuner } = make();
    catchup.enter(yesterday, false);
    const listener = vi.fn();
    const unsubscribe = catchup.subscribe(listener);
    tuner.tune(other);
    expect(listener).toHaveBeenCalled();
    expect(catchup.state).toBeNull();
    expect(catchup.onKey({ kind: 'None' }, 'FAST_FORWARD')).toBe(false);
    unsubscribe();
  });
  it('seeks within the archive, tracks the position and re-shows the transport', () => {
    const { catchup, engine, seams } = make();
    catchup.seekBy(30_000);
    expect(engine.seekTo).not.toHaveBeenCalled();
    catchup.enter(yesterday, false);
    engine.positionMs = 5_000;
    catchup.refreshPosition();
    expect(catchup.position.value).toBe(5_000);
    expect(catchup.onKey({ kind: 'Info' }, 'FAST_FORWARD')).toBe(true);
    expect(engine.seekTo).toHaveBeenCalledWith(35_000);
    expect(catchup.position.value).toBe(35_000);
    catchup.seekBy(-HOUR);
    expect(engine.seekTo).toHaveBeenLastCalledWith(0);
    engine.positionMs = HOUR - 1_000;
    catchup.seekBy(30_000);
    expect(engine.seekTo).toHaveBeenLastCalledWith(HOUR);
    expect(seams.showTransport).toHaveBeenCalledTimes(4);
  });
  it('a finished archive returns to live playback of the same channel; live ends are ignored', () => {
    const { catchup, engine, tuner } = make();
    const unwatch = catchup.watch();
    tuner.tune(channel);
    engine.setState({ kind: 'Ended' });
    expect(tuner.playing?.kind).toBe('Live');
    expect(engine.load).toHaveBeenCalledTimes(1);
    catchup.enter(yesterday, false);
    engine.setState({ kind: 'Playing' });
    engine.setState({ kind: 'Ended' });
    expect(tuner.playing).toEqual({ kind: 'Live', channel });
    expect(catchup.state).toBeNull();
    unwatch();
  });
  it('replays a seek issued before the media attached once the engine plays', () => {
    const { catchup, engine } = make();
    const unwatch = catchup.watch();
    catchup.enter(yesterday, false);
    catchup.seekBy(30_000);
    expect(engine.seekTo).toHaveBeenCalledTimes(1);
    engine.setState({ kind: 'Buffering' });
    engine.positionMs = 0;
    engine.setState({ kind: 'Playing' });
    expect(engine.seekTo).toHaveBeenCalledTimes(2);
    expect(engine.seekTo).toHaveBeenLastCalledWith(30_000);
    engine.setState({ kind: 'Buffering' });
    engine.setState({ kind: 'Playing' });
    expect(engine.seekTo).toHaveBeenCalledTimes(2);
    catchup.seekBy(5_000);
    expect(engine.seekTo).toHaveBeenCalledTimes(3);
    catchup.enter(yesterday, false);
    engine.setState({ kind: 'Idle' });
    engine.setState({ kind: 'Playing' });
    expect(engine.seekTo).toHaveBeenCalledTimes(3);
    unwatch();
  });
  it('BACK returns to the guide when entered from the guide, to live when entered from live', () => {
    const { catchup, seams, tuner } = make();
    catchup.back();
    expect(seams.exitToGuide).not.toHaveBeenCalled();
    catchup.enter(yesterday, false);
    expect(catchup.onKey({ kind: 'None' }, 'BACK')).toBe(true);
    expect(seams.exitToGuide).toHaveBeenCalledTimes(1);
    expect(catchup.state).toBeNull();
    expect(tuner.playing?.kind).toBe('Archive');
    catchup.enter(yesterday, true);
    catchup.back();
    expect(tuner.playing).toEqual({ kind: 'Live', channel });
  });
  it('pause pins the transport and resume re-shows it', () => {
    const { catchup, engine, seams } = make();
    catchup.enter(yesterday, false);
    catchup.pause.toggle();
    expect(engine.paused).toBe(true);
    expect(seams.pinTransport).toHaveBeenCalledTimes(1);
    catchup.pause.toggle();
    expect(engine.paused).toBe(false);
    expect(seams.showTransport).toHaveBeenCalledTimes(2);
  });
  it('hops to the neighbouring archives, keeping the entry origin, and to live at the newest edge', async () => {
    const { catchup, tuner } = make();
    await catchup.hop.previous();
    expect(tuner.playing).toBeNull();
    catchup.enter(yesterday, true);
    await catchup.hop.previous();
    expect(catchup.state?.request.title).toBe('B');
    expect(catchup.state?.fromLive).toBe(true);
    await catchup.hop.previous();
    expect(catchup.state?.request.title).toBe('B');
    await catchup.hop.next();
    expect(catchup.state?.request.title).toBe('C');
    await catchup.hop.next();
    expect(catchup.state).toBeNull();
    expect(tuner.playing).toEqual({ kind: 'Live', channel });
    await catchup.hop.next();
    expect(tuner.playing).toEqual({ kind: 'Live', channel });
  });
  it('rewinds live into the airing programme at live edge minus the step', async () => {
    const { catchup, tuner, engine } = make();
    await catchup.hop.rewindFromLive(null, 10_000, NOW);
    expect(tuner.playing).toBeNull();
    tuner.tune(other);
    await catchup.hop.rewindFromLive(other, 10_000, NOW);
    expect(tuner.playing?.kind).toBe('Live');
    tuner.tune(channel);
    const liveCatchup = new CatchupPlayback({
      ...catchup.deps,
      seekKeys: () => ({ ...DEFAULT_SEEK_KEYS, rwLive: true }),
    });
    expect(liveCatchup.onKey({ kind: 'None' }, 'REWIND')).toBe(true);
    await vi.waitFor(() => expect(liveCatchup.state?.request.title).toBe('Airing'));
    expect(liveCatchup.state?.fromLive).toBe(true);
    expect(engine.seekTo).toHaveBeenLastCalledWith(HOUR - 10_000);
  });
});
