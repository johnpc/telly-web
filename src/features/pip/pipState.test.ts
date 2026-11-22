import { describe, expect, it, vi } from 'vitest';
import { enterPip, pipSupported } from './pipEnter';
import { PipState, sharedPipState } from './pipState';

describe('PipState', () => {
  it('mirrors the element events and gates the background stop', () => {
    const pip = new PipState();
    const seen = vi.fn();
    pip.subscribe(seen);
    const video = document.createElement('video');
    const unbind = pip.attach(video);
    video.dispatchEvent(new Event('enterpictureinpicture'));
    expect(pip.current).toBe('InPip');
    expect(pip.allowsBackgroundStop()).toBe(false);
    pip.setInPip(true);
    video.dispatchEvent(new Event('leavepictureinpicture'));
    expect(pip.inPip).toBe(false);
    expect(seen).toHaveBeenCalledTimes(2);
    unbind();
    video.dispatchEvent(new Event('enterpictureinpicture'));
    expect(pip.inPip).toBe(false);
    expect(sharedPipState.allowsBackgroundStop()).toBe(true);
  });

  it('enterPip clears the chrome first and asks the browser only when supported', async () => {
    const clear = vi.fn();
    expect(await enterPip(null, clear, true)).toBe(false);
    const video = document.createElement('video');
    expect(await enterPip(video, clear, false)).toBe(false);
    const request = vi.fn(async () => ({}) as PictureInPictureWindow);
    video.requestPictureInPicture = request;
    expect(await enterPip(video, clear, true)).toBe(true);
    video.requestPictureInPicture = vi.fn(async () => {
      throw new Error('denied');
    });
    expect(await enterPip(video, clear, true)).toBe(false);
    video.disablePictureInPicture = true;
    expect(await enterPip(video, clear, true)).toBe(false);
    expect(clear).toHaveBeenCalledTimes(5);
    expect(typeof pipSupported()).toBe('boolean');
    expect(pipSupported({} as Document)).toBe(false);
  });
});
