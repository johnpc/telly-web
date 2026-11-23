import { describe, expect, it, vi } from 'vitest';
import { playableAsCatchup } from './catchupPlayability';
import { archiveRequest, requestOf } from './catchupRequest';
import { CatchupSession, durationOf } from './catchupSession';
import { GuideCatchup } from './guideCatchup';
import { HOUR, NOW, channelRow, programRow, request } from './testFixtures';

const channel = channelRow(1);
const aired = programRow('c1', NOW - 3 * HOUR, NOW - 2 * HOUR, 'Earlier');

describe('CatchupSession', () => {
  it('hands a request over exactly once', () => {
    const session = new CatchupSession();
    expect(session.consume()).toBeNull();
    const r = request(channel, NOW - 2 * HOUR, NOW - HOUR);
    session.set(r);
    expect(session.consume()).toBe(r);
    expect(session.consume()).toBeNull();
    expect(durationOf(r)).toBe(HOUR);
  });
  it('GuideCatchup parks the request and goes fullscreen', () => {
    const session = new CatchupSession();
    const go = vi.fn();
    const r = request(channel, NOW - 2 * HOUR, NOW - HOUR);
    GuideCatchup.play(r, go, session);
    expect(go).toHaveBeenCalledTimes(1);
    expect(session.consume()).toBe(r);
  });
});

describe('playableAsCatchup', () => {
  it('needs a real, fully aired programme inside the catchup-days horizon on a capable channel', () => {
    expect(playableAsCatchup(channel, NOW - 2 * HOUR, NOW - HOUR, true, NOW)).toBe(true);
    expect(playableAsCatchup(channel, NOW - 2 * HOUR, NOW - HOUR, false, NOW)).toBe(false);
    expect(playableAsCatchup(channel, NOW - HOUR, NOW + HOUR, true, NOW)).toBe(false);
    expect(playableAsCatchup(channel, NOW - 49 * HOUR, NOW - 48 * HOUR, true, NOW)).toBe(false);
    expect(playableAsCatchup(channel, NOW - 47 * HOUR, NOW - 46 * HOUR, true, NOW)).toBe(true);
    const plain = channelRow(2, { catchupType: null, catchupSource: null });
    expect(playableAsCatchup(plain, NOW - 2 * HOUR, NOW - HOUR, true, NOW)).toBe(false);
  });
});

describe('requestOf / archiveRequest', () => {
  it('builds the request from the channel attributes and the programme window', () => {
    const r = requestOf(channel, aired.startMs, aired.endMs, aired, NOW);
    expect(r).toEqual({
      channel,
      url: `http://x/1.ts?utc=${aired.startMs / 1000}&d=3600`,
      title: 'Earlier',
      startMs: aired.startMs,
      endMs: aired.endMs,
    });
    expect(requestOf(channel, aired.startMs, aired.endMs, null, NOW)?.title).toBeNull();
  });
  it('is null without attributes or without a buildable URL', () => {
    expect(requestOf(channelRow(2, { catchupType: null, catchupSource: null }), 0, 1, null, NOW)).toBeNull();
    const odd = channelRow(3, { catchupType: 'xc', catchupSource: null, streamUrl: 'http://h/odd' });
    expect(requestOf(odd, 0, 1, null, NOW)).toBeNull();
  });
  it('archiveRequest also enforces playability', () => {
    expect(archiveRequest(channel, aired, NOW)?.title).toBe('Earlier');
    expect(archiveRequest(channel, programRow('c1', NOW - HOUR, NOW + HOUR), NOW)).toBeNull();
  });
});
