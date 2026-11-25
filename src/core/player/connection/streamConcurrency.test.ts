import { beforeEach, describe, expect, it } from 'vitest';
import { errorState } from './engineState';
import {
  LIMIT_TTL_MS,
  SLATE_WINDOW_MS,
  STREAM_LIMITED,
  STREAM_LIMIT_MESSAGE,
  StreamConcurrency,
  isStreamLimited,
  streamHostOf,
} from './streamConcurrency';

const A = 'http://provider.example/live/1.ts';
const B = 'http://provider.example/live/2.ts';
const OTHER = 'http://elsewhere.example/live/9.ts';

describe('StreamConcurrency', () => {
  let now: number;
  let timers: { delayMs: number; task: () => void }[];
  let registry: StreamConcurrency;

  beforeEach(() => {
    now = 1_000_000;
    timers = [];
    registry = new StreamConcurrency(
      () => now,
      (delayMs, task) => timers.push({ delayMs, task }),
    );
  });

  it('starts Unknown; a lone live stream ending at once is not a verdict', () => {
    expect(registry.state).toEqual({ kind: 'Unknown' });
    const only = registry.open(A, true);
    now += 1_000;
    expect(only.close('Ended')).toBe(false);
    expect(registry.state).toEqual({ kind: 'Unknown' });
    expect(registry.wouldExceed(B)).toBe(false);
  });

  it('a second live stream from the host that Ends inside the window proves Limited(host)', () => {
    registry.open(A, true);
    now += 5_000;
    const second = registry.open(B, true);
    expect(registry.state).toEqual({ kind: 'Suspected', host: 'provider.example', since: now });
    now += 3_000;
    expect(second.close('Ended')).toBe(true);
    expect(registry.state).toEqual({ kind: 'Limited', host: 'provider.example', since: now });
    expect(registry.wouldExceed(B)).toBe(true);
    expect(registry.wouldExceed(OTHER)).toBe(false);
    expect(second.close('Ended')).toBe(false); // already closed: nothing to say twice
  });

  it('an Error inside the window proves it too; a user Closed, a late end or a finite file never do', () => {
    const first = registry.open(A, true);
    expect(registry.open(B, true).close('Closed')).toBe(false);
    expect(registry.state).toEqual({ kind: 'Unknown' });
    expect(registry.open(B, false).close('Ended')).toBe(false);
    const late = registry.open(B, true);
    now += SLATE_WINDOW_MS;
    expect(late.close('Error')).toBe(false);
    expect(registry.open(B, true).close('Error')).toBe(true);
    expect(first.close('Closed')).toBe(false);
    // The limit is remembered, but with nothing open a new tune may try the line.
    expect(registry.wouldExceed(A)).toBe(false);
  });

  it('two concurrent streams that both outlive the window clear the host', () => {
    registry.open(A, true);
    registry.open(B, true);
    expect(timers.map((t) => t.delayMs)).toEqual([SLATE_WINDOW_MS]);
    now += SLATE_WINDOW_MS;
    timers[0]?.task();
    expect(registry.state).toEqual({ kind: 'Cleared' });
  });

  it('the window check is a no-op once the pair broke up, and a Limited host is cleared by a surviving pair', () => {
    registry.open(A, true);
    const second = registry.open(B, true);
    second.close('Closed');
    expect(registry.state).toEqual({ kind: 'Unknown' });
    timers[0]?.task();
    expect(registry.state).toEqual({ kind: 'Unknown' });

    registry.open(B, true).close('Ended');
    expect(registry.state.kind).toBe('Limited');
    registry.open(B, true);
    expect(registry.state.kind).toBe('Limited');
    now += SLATE_WINDOW_MS;
    timers[2]?.task();
    expect(registry.state).toEqual({ kind: 'Cleared' });
  });

  it('Limited expires after ten minutes, read lazily', () => {
    registry.open(A, true);
    registry.open(B, true).close('Ended');
    now += LIMIT_TTL_MS - 1;
    expect(registry.wouldExceed(B)).toBe(true);
    now += 1;
    expect(registry.wouldExceed(B)).toBe(false);
    expect(registry.state).toEqual({ kind: 'Cleared' });
  });

  it('a limit on one host is not cleared by a pair surviving on another', () => {
    registry.open(A, true);
    registry.open(B, true).close('Ended');
    registry.open(OTHER, true);
    registry.open(OTHER, true);
    now += SLATE_WINDOW_MS;
    timers[1]?.task();
    expect(registry.state.kind).toBe('Limited');
  });
});

describe('streamHostOf', () => {
  it('names the provider host, unwrapping the Stream & CORS proxy in both shapes', () => {
    expect(streamHostOf('http://provider.example:8080/live/1.ts')).toBe('provider.example:8080');
    const inner = 'http://provider.example/live/1.ts?token=x';
    expect(streamHostOf(`https://telly.example/proxy/?url=${encodeURIComponent(inner)}`)).toBe(
      'provider.example',
    );
    expect(streamHostOf(`https://cors.example/${encodeURIComponent(inner)}`)).toBe('provider.example');
    expect(streamHostOf(`https://cors.example/?${encodeURIComponent(inner)}`)).toBe('provider.example');
    expect(streamHostOf('https://cors.example/proxy/?url=not-a-url')).toBe('cors.example');
    expect(streamHostOf('blob:http://telly.example/abc')).toBe('blob:http://telly.example/abc');
  });
});

describe('isStreamLimited', () => {
  it('recognizes the one terminal state the limit surfaces', () => {
    expect(isStreamLimited(STREAM_LIMITED)).toBe(true);
    expect(isStreamLimited(errorState(STREAM_LIMIT_MESSAGE))).toBe(true);
    expect(isStreamLimited(errorState('MEDIA_ERR_NETWORK'))).toBe(false);
    expect(isStreamLimited({ kind: 'Ended' })).toBe(false);
  });
});
