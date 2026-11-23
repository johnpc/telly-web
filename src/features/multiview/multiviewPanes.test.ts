import { describe, expect, it, vi } from 'vitest';
import { channel, fakeEngine, type FakeEngine } from '@/features/playback/fixtures.test';
import { MultiviewPanes } from './multiviewPanes';

function panesWithPool(): { panes: MultiviewPanes; engines: FakeEngine[] } {
  const engines: FakeEngine[] = [];
  const panes = new MultiviewPanes(
    () => {
      const engine = fakeEngine();
      engines.push(engine);
      return engine;
    },
    (url) => `${url}?proxied`,
  );
  return { panes, engines };
}

describe('MultiviewPanes', () => {
  it('adds up to four panes on their own engines, the newest focused and the only one unmuted', () => {
    const { panes, engines } = panesWithPool();
    const ticks = vi.fn();
    panes.subscribe(ticks);
    expect(panes.focused).toBeNull();
    expect(panes.add(channel(1))).toBe(true);
    expect(engines[0]?.load).toHaveBeenCalledWith('http://x/1.ts?proxied', { live: true });
    expect(panes.add(channel(2))).toBe(true);
    expect(panes.add(channel(3))).toBe(true);
    expect(panes.add(channel(4))).toBe(true);
    expect(panes.add(channel(5))).toBe(false);
    expect(panes.panes.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(panes.focusedId).toBe(4);
    expect(engines.map((e) => e.muted)).toEqual([true, true, true, false]);
    expect(ticks).toHaveBeenCalled();
  });

  it('focus moves audio, change retunes the focused pane in place, remove collapses onto a neighbour', () => {
    const { panes, engines } = panesWithPool();
    panes.add(channel(1));
    panes.add(channel(2));
    panes.add(channel(3));
    panes.focus(99);
    expect(panes.focusedId).toBe(3);
    panes.focus(2);
    expect(engines.map((e) => e.muted)).toEqual([true, false, true]);
    panes.change(channel(7));
    expect(engines[1]?.load).toHaveBeenLastCalledWith('http://x/7.ts?proxied', { live: true });
    expect(panes.focused?.channel.id).toBe(7);
    expect(panes.removeFocused()).toBe(true);
    expect(engines[1]?.release).toHaveBeenCalledTimes(1);
    expect(panes.panes.map((p) => p.id)).toEqual([1, 3]);
    expect(panes.focusedId).toBe(3);
    panes.removeFocused();
    expect(panes.focusedId).toBe(1);
    expect(panes.removeFocused()).toBe(false);
    expect(panes.panes).toHaveLength(1);
  });

  it('honours the resize mode on existing and new panes, changes nothing without a focus, and releases everything', () => {
    const { panes, engines } = panesWithPool();
    panes.change(channel(1));
    expect(engines).toHaveLength(0);
    panes.add(channel(1));
    panes.setResizeMode('zoom');
    panes.add(channel(2));
    expect(engines.map((e) => e.resizeMode)).toEqual(['Zoom', 'Zoom']);
    panes.releaseAll();
    expect(engines.every((e) => vi.mocked(e.release).mock.calls.length === 1)).toBe(true);
    expect(panes.panes).toEqual([]);
    expect(panes.focused).toBeNull();
  });
});
