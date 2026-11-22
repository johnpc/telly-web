import { describe, expect, it, vi } from 'vitest';
import { AudioSyncDelay, MAX_DELAY_MS } from './audioSync';

function fakeAudioContext() {
  const delay = { delayTime: { value: 0 }, connect: vi.fn() };
  const source = { connect: vi.fn() };
  const context = {
    state: 'suspended' as AudioContextState,
    destination: {},
    createDelay: vi.fn(() => delay),
    createMediaElementSource: vi.fn(() => source),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };
  const Ctor = vi.fn(function () {
    return context;
  }) as unknown as new () => AudioContext;
  return { Ctor, context, delay, source };
}

describe('AudioSyncDelay', () => {
  it('is unsupported where AudioContext is missing (jsdom): the setter is a no-op', () => {
    const sync = new AudioSyncDelay(document.createElement('video'), null);
    expect(sync.support).toBe('unsupported');
    expect(sync.set(250)).toBe(0);
    expect(sync.offsetMs).toBe(0);
    sync.resume();
    sync.release();
  });

  it('delays audio by positive offsets through a lazily built DelayNode', () => {
    const { Ctor, context, delay, source } = fakeAudioContext();
    const video = document.createElement('video');
    const sync = new AudioSyncDelay(video, Ctor);
    expect(sync.support).toBe('delay-only');

    expect(sync.set(0)).toBe(0);
    expect(context.createDelay).not.toHaveBeenCalled();

    expect(sync.set(150)).toBe(150);
    expect(context.createDelay).toHaveBeenCalledWith(MAX_DELAY_MS / 1000);
    expect(context.createMediaElementSource).toHaveBeenCalledWith(video);
    expect(source.connect).toHaveBeenCalledWith(delay);
    expect(delay.connect).toHaveBeenCalledWith(context.destination);
    expect(delay.delayTime.value).toBe(0.15);

    sync.set(300);
    expect(context.createDelay).toHaveBeenCalledTimes(1);
    expect(delay.delayTime.value).toBe(0.3);
  });

  it('clamps: negative offsets (audio earlier) cannot be honoured, huge ones cap at MAX_DELAY_MS', () => {
    const { Ctor, delay } = fakeAudioContext();
    const sync = new AudioSyncDelay(document.createElement('video'), Ctor);
    expect(sync.set(-200)).toBe(0);
    expect(sync.set(99_999)).toBe(MAX_DELAY_MS);
    expect(delay.delayTime.value).toBe(5);
  });

  it('resumes a suspended context on play and closes it on release', () => {
    const { Ctor, context } = fakeAudioContext();
    const sync = new AudioSyncDelay(document.createElement('video'), Ctor);
    sync.set(100);
    sync.resume();
    expect(context.resume).toHaveBeenCalledTimes(1);
    sync.release();
    expect(context.close).toHaveBeenCalledTimes(1);
    sync.release();
    expect(context.close).toHaveBeenCalledTimes(1);
  });
});
