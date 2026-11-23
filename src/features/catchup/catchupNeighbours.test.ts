import { describe, expect, it } from 'vitest';
import { ProgramRepository } from '@/core/db/programRepository';
import { freshDb, programImport } from '@/test/dbFixtures';
import { createCatchupEpg } from './catchupEpg';
import { CatchupNeighbours, LIVE_JUMP, SCAN_MS, liveEdgeRequest } from './catchupNeighbours';
import { HOUR, NOW, channelRow, request } from './testFixtures';

const channel = channelRow(1);

async function epgWith(offsetMinutes = 0) {
  const programs = new ProgramRepository(freshDb());
  // c1: ... [-4h,-3h) A, [-3h,-2h) B, [-2h,-1h) C, [-1h,+1h) Airing
  await programs.replaceFor(
    ['c1'],
    [
      programImport('c1', NOW - 4 * HOUR, NOW - 3 * HOUR, 'A'),
      programImport('c1', NOW - 3 * HOUR, NOW - 2 * HOUR, 'B'),
      programImport('c1', NOW - 2 * HOUR, NOW - HOUR, 'C'),
      programImport('c1', NOW - HOUR, NOW + HOUR, 'Airing'),
    ],
  );
  const epg = createCatchupEpg(programs);
  const ch = channelRow(1, { epgOffsetMinutes: offsetMinutes });
  return { epg, neighbours: new CatchupNeighbours(epg, () => NOW), ch };
}

describe('createCatchupEpg', () => {
  it('reads the channel window and the airing programme, shifted by the EPG offset', async () => {
    const { epg } = await epgWith();
    const rows = await epg.programmesFor(channel, NOW - 3 * HOUR, NOW - HOUR);
    expect(rows.map((p) => p.title)).toEqual(['B', 'C']);
    expect((await epg.airingAt(channel, NOW))?.title).toBe('Airing');
    const shifted = await epgWith(60);
    const moved = await shifted.epg.programmesFor(shifted.ch, NOW - 3 * HOUR, NOW - 2 * HOUR);
    expect(moved.map((p) => [p.title, p.startMs])).toEqual([['A', NOW - 3 * HOUR]]);
    expect(await shifted.epg.airingAt(shifted.ch, NOW)).toMatchObject({ title: 'Airing', startMs: NOW });
    const noEpg = channelRow(9, { tvgId: null });
    expect(await epg.programmesFor(noEpg, 0, NOW)).toEqual([]);
    expect(await epg.airingAt(noEpg, NOW)).toBeNull();
  });
});

describe('CatchupNeighbours', () => {
  it('previous = the newest programme ending at or before the archive start, inside the horizon', async () => {
    const { neighbours } = await epgWith();
    const c = request(channel, NOW - 2 * HOUR, NOW - HOUR, 'C');
    expect((await neighbours.previous(c))?.title).toBe('B');
    const a = request(channel, NOW - 4 * HOUR, NOW - 3 * HOUR, 'A');
    expect(await neighbours.previous(a)).toBeNull();
    expect(SCAN_MS).toBe(6 * HOUR);
  });
  it('next = the oldest programme starting at or after the archive end; the airing one is the Live jump', async () => {
    const { neighbours } = await epgWith();
    const b = request(channel, NOW - 3 * HOUR, NOW - 2 * HOUR, 'B');
    const jump = await neighbours.next(b);
    expect(jump.kind === 'Archive' && jump.request.title).toBe('C');
    const c = request(channel, NOW - 2 * HOUR, NOW - HOUR, 'C');
    expect(await neighbours.next(c)).toBe(LIVE_JUMP);
    const edge = request(channel, NOW + HOUR, NOW + 2 * HOUR, 'Future');
    expect(await neighbours.next(edge)).toBe(LIVE_JUMP);
  });
  it('next past the horizon falls back to live too', async () => {
    const { epg } = await epgWith();
    const old = new CatchupNeighbours(epg, () => NOW + 3 * 24 * HOUR);
    const b = request(channel, NOW - 3 * HOUR, NOW - 2 * HOUR, 'B');
    expect(await old.next(b)).toBe(LIVE_JUMP);
  });
});

describe('liveEdgeRequest', () => {
  it('builds the airing programme into a request; null without EPG or capability', async () => {
    const { epg } = await epgWith();
    const r = await liveEdgeRequest(epg, channel, NOW);
    expect(r?.title).toBe('Airing');
    expect(r?.startMs).toBe(NOW - HOUR);
    expect(await liveEdgeRequest(epg, channelRow(9, { tvgId: null }), NOW)).toBeNull();
    const plain = channelRow(1, { catchupType: null, catchupSource: null });
    expect(await liveEdgeRequest(epg, plain, NOW)).toBeNull();
  });
});
