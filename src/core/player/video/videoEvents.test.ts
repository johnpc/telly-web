import { describe, expect, it, vi } from 'vitest';
import { defineReadOnly, fire } from '../testSupport';
import { bindVideoEvents, mediaErrorName } from './videoEvents';

describe('video events', () => {
  it('maps media events onto the engine callbacks and unbinds cleanly', () => {
    const video = document.createElement('video');
    const handlers = { onBuffering: vi.fn(), onReady: vi.fn(), onEnded: vi.fn(), onError: vi.fn() };
    const unbind = bindVideoEvents(video, handlers);

    fire(video, 'loadstart');
    fire(video, 'waiting');
    fire(video, 'seeking');
    fire(video, 'playing');
    fire(video, 'ended');
    fire(video, 'pause');
    expect(handlers.onBuffering).toHaveBeenCalledTimes(3);
    expect(handlers.onReady).toHaveBeenCalledTimes(1);
    expect(handlers.onEnded).toHaveBeenCalledTimes(1);

    defineReadOnly(video, 'error', { code: 2, message: '' });
    fire(video, 'error');
    expect(handlers.onError).toHaveBeenCalledWith('MEDIA_ERR_NETWORK');

    unbind();
    fire(video, 'playing');
    expect(handlers.onReady).toHaveBeenCalledTimes(1);
  });

  it('names MediaError codes like Android error-code names', () => {
    const error = (code: number): MediaError => ({ code, message: '' }) as MediaError;
    expect(mediaErrorName(error(1))).toBe('MEDIA_ERR_ABORTED');
    expect(mediaErrorName(error(3))).toBe('MEDIA_ERR_DECODE');
    expect(mediaErrorName(error(4))).toBe('MEDIA_ERR_SRC_NOT_SUPPORTED');
    expect(mediaErrorName(error(9))).toBe('MEDIA_ERR_UNKNOWN');
    expect(mediaErrorName(null)).toBe('MEDIA_ERR_UNKNOWN');
    expect(mediaErrorName(undefined)).toBe('MEDIA_ERR_UNKNOWN');
  });
});
