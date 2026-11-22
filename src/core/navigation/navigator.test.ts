import { describe, expect, it, vi } from 'vitest';
import { depthOf, Navigator, type HistoryPort } from './navigator';
import { sameRoute, type Route } from './routes';

function fakeHistory(): HistoryPort & { log: string[] } {
  const log: string[] = [];
  return {
    log,
    pushState: (state) => log.push(`push:${JSON.stringify(state)}`),
    replaceState: (state) => log.push(`replace:${JSON.stringify(state)}`),
    back: () => log.push('back'),
  };
}

const settings: Route = { kind: 'Settings' };
const guide: Route = { kind: 'Guide' };

describe('Navigator', () => {
  it('starts at Welcome by default and never empties', () => {
    const nav = new Navigator();
    expect(nav.current).toEqual({ kind: 'Welcome' });
    expect(nav.stack).toEqual([{ kind: 'Welcome' }]);
    expect(nav.pop()).toBe(false);
    expect(nav.stack).toHaveLength(1);
  });

  it('push / pop / replaceAll like the Android back stack, notifying subscribers', () => {
    const nav = new Navigator({ kind: 'Playback' });
    const listener = vi.fn();
    const unsubscribe = nav.subscribe(listener);
    nav.push(guide);
    nav.push(settings);
    expect(nav.current).toEqual(settings);
    expect(nav.stack).toEqual([{ kind: 'Playback' }, guide, settings]);
    expect(nav.pop()).toBe(true);
    expect(nav.current).toEqual(guide);
    nav.replaceAll({ kind: 'VodPlayback', itemKey: 'k1' });
    expect(nav.stack).toEqual([{ kind: 'VodPlayback', itemKey: 'k1' }]);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    nav.push(guide);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('keeps window.history in step', () => {
    const history = fakeHistory();
    const nav = new Navigator({ kind: 'Boot' }, history);
    nav.push(guide);
    nav.push(settings);
    nav.pop();
    nav.replaceAll({ kind: 'Playback' });
    expect(history.log).toEqual([
      'replace:{"tellyDepth":1}',
      'push:{"tellyDepth":2}',
      'push:{"tellyDepth":3}',
      'back',
      'replace:{"tellyDepth":1}',
    ]);
  });

  it('popstate trims the stack to the arriving entry’s depth and ignores forward / foreign entries', () => {
    const nav = new Navigator({ kind: 'Playback' }, fakeHistory());
    nav.push(guide);
    nav.push(settings);
    nav.push({ kind: 'ReorderChannels', group: 'News' });
    const listener = vi.fn();
    nav.subscribe(listener);
    nav.onPopState({ tellyDepth: 2 });
    expect(nav.stack).toEqual([{ kind: 'Playback' }, guide]);
    expect(listener).toHaveBeenCalledTimes(1);
    nav.onPopState({ tellyDepth: 5 });
    nav.onPopState({ tellyDepth: 2 });
    expect(nav.stack).toHaveLength(2);
    nav.onPopState(null);
    expect(nav.stack).toEqual([{ kind: 'Playback' }]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('after a programmatic pop, the echoed popstate is a no-op', () => {
    const nav = new Navigator({ kind: 'Playback' }, fakeHistory());
    nav.push(guide);
    nav.pop();
    nav.onPopState({ tellyDepth: 1 });
    expect(nav.stack).toEqual([{ kind: 'Playback' }]);
  });
});

describe('depthOf', () => {
  it('reads our stamp and treats anything else as the root', () => {
    expect(depthOf({ tellyDepth: 4 })).toBe(4);
    expect(depthOf({ tellyDepth: 'x' })).toBe(1);
    expect(depthOf({ other: 1 })).toBe(1);
    expect(depthOf(null)).toBe(1);
    expect(depthOf(undefined)).toBe(1);
    expect(depthOf(7)).toBe(1);
  });
});

describe('sameRoute', () => {
  it('compares routes structurally', () => {
    expect(sameRoute({ kind: 'Guide' }, { kind: 'Guide' })).toBe(true);
    expect(sameRoute({ kind: 'VodPlayback', itemKey: 'a' }, { kind: 'VodPlayback', itemKey: 'b' })).toBe(
      false,
    );
    expect(sameRoute({ kind: 'Search' }, { kind: 'History' })).toBe(false);
  });
});
