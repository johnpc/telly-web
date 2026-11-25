import { describe, expect, it } from 'vitest';
import { ActiveStream } from './activeStream';
import { BUFFERING, errorState, IDLE, PLAYING, reconnecting } from './engineState';

describe('ActiveStream', () => {
  it('the loaded url is current only while actively streaming', () => {
    const active = new ActiveStream();
    active.onLoad('http://s/1.ts');

    expect(active.current).toBe('http://s/1.ts');
    expect(active.isCurrent('http://s/1.ts', PLAYING, false)).toBe(true);
    expect(active.isCurrent('http://s/1.ts', BUFFERING, false)).toBe(true);
    expect(active.isCurrent('http://s/1.ts', reconnecting(1, 0), false)).toBe(true);
    expect(active.isCurrent('http://s/2.ts', PLAYING, false)).toBe(false);
  });

  it('an errored, paused, idle or stopped stream is never current', () => {
    const active = new ActiveStream();
    active.onLoad('http://s/1.ts');

    expect(active.isCurrent('http://s/1.ts', errorState('boom'), false)).toBe(false);
    expect(active.isCurrent('http://s/1.ts', IDLE, false)).toBe(false);
    expect(active.isCurrent('http://s/1.ts', PLAYING, true)).toBe(false);

    active.onStop();
    expect(active.current).toBeNull();
    expect(active.isCurrent('http://s/1.ts', PLAYING, false)).toBe(false);
  });
});
