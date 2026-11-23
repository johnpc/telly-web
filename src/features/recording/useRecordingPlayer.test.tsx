import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerEngine } from '@/core/player';
import { fakeRecording } from './recordingTestSupport';
import { loadCapture, useCaptureEngine, useCaptureTransport } from './useRecordingPlayer';

describe('loadCapture', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the closed file through an object URL and revokes it on cleanup', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:capture');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const engine = { load: vi.fn() } as unknown as PlayerEngine;
    const settled = vi.fn().mockResolvedValue(undefined);
    const center = {
      whenSettled: settled,
      blobOf: vi.fn().mockResolvedValue(new Blob([new Uint8Array([1])])),
    };
    const cleanup = loadCapture(engine, fakeRecording({ id: 3 }), center);
    await vi.waitFor(() => expect(engine.load).toHaveBeenCalledWith('blob:capture', { live: false }));
    expect(settled).toHaveBeenCalledWith(3);
    cleanup();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:capture');
  });

  it('does nothing for a vanished file or after the component went away', async () => {
    const createObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const engine = { load: vi.fn() } as unknown as PlayerEngine;
    const gone = { whenSettled: () => Promise.resolve(), blobOf: () => Promise.resolve(null) };
    loadCapture(engine, fakeRecording(), gone);
    await Promise.resolve();
    await Promise.resolve();
    const slow = { whenSettled: () => Promise.resolve(), blobOf: () => Promise.resolve(new Blob()) };
    loadCapture(engine, fakeRecording(), slow)();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(engine.load).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});

describe('useCaptureTransport', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('samples position and duration twice a second', () => {
    const engine = { positionMs: 1_000, durationMs: 9_000 } as unknown as PlayerEngine;
    const { result, unmount } = renderHook(() => useCaptureTransport(engine));
    expect(result.current).toEqual({ positionMs: 0, durationMs: 0 });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toEqual({ positionMs: 1_000, durationMs: 9_000 });
    unmount();
  });
});

describe('useCaptureEngine', () => {
  it('owns one engine per mount and releases it on unmount', () => {
    const { result, unmount } = renderHook(() => useCaptureEngine('cap.ts'));
    const engine = result.current;
    expect(engine.video).not.toBeNull();
    const release = vi.spyOn(engine, 'release');
    unmount();
    expect(release).toHaveBeenCalled();
  });
});
