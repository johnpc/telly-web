import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { channel, fakeEngine, tunerOver } from '../fixtures.test';
import { PlaybackLifecycle } from './playbackLifecycle';
import { useVisibilitySuspend } from './useVisibilitySuspend';

describe('PlaybackLifecycle', () => {
  it('stops on background and re-tunes exactly once on the next foreground', () => {
    const engine = fakeEngine();
    const tuner = tunerOver(engine, [channel(1)]);
    const lifecycle = new PlaybackLifecycle(tuner, engine);
    lifecycle.onBackground();
    expect(engine.stop).not.toHaveBeenCalled();
    expect(lifecycle.onForeground()).toBe(false);
    tuner.start();
    lifecycle.onBackground();
    expect(engine.stop).toHaveBeenCalledTimes(1);
    expect(lifecycle.current).toBe('Suspended');
    expect(lifecycle.onForeground()).toBe(true);
    expect(engine.load).toHaveBeenCalledTimes(2);
    expect(lifecycle.onForeground()).toBe(false);
    const pip = new PlaybackLifecycle(tuner, engine, () => false);
    pip.onBackground();
    expect(pip.current).toBe('Running');
  });

  it('useVisibilitySuspend binds document visibility to the lifecycle', () => {
    const lifecycle = { onBackground: vi.fn(), onForeground: vi.fn() } as unknown as PlaybackLifecycle;
    let visibility: DocumentVisibilityState = 'visible';
    const doc = document;
    vi.spyOn(doc, 'visibilityState', 'get').mockImplementation(() => visibility);
    const { unmount } = renderHook(() => useVisibilitySuspend(lifecycle, doc));
    visibility = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    visibility = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(lifecycle.onBackground).toHaveBeenCalledTimes(1);
    expect(lifecycle.onForeground).toHaveBeenCalledTimes(1);
    unmount();
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(lifecycle.onForeground).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
