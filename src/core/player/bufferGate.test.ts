import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BufferGate, attachBufferGate, bufferedAhead, bufferedToEnd, thresholdsFor } from './bufferGate';
import { defineReadOnly, fakeTimeRanges, fire, stubMediaPlayback } from './testSupport';

function video(ahead: number, currentTime = 10): HTMLVideoElement {
  const v = document.createElement('video');
  defineReadOnly(v, 'buffered', fakeTimeRanges([[0, currentTime + ahead]]));
  v.currentTime = currentTime;
  return v;
}

describe('bufferGate', () => {
  beforeEach(() => stubMediaPlayback());

  it('maps Buffer size to Android thresholds (Small default)', () => {
    expect(thresholdsFor('Small')).toEqual({ runwaySec: 6 });
    expect(thresholdsFor('Medium')).toEqual({ runwaySec: 8 });
    expect(thresholdsFor('Large')).toEqual({ runwaySec: 12 });
    expect(thresholdsFor('Nonsense')).toEqual(thresholdsFor('Small'));
  });

  it('measures the runway from the range containing the playhead', () => {
    const v = document.createElement('video');
    defineReadOnly(
      v,
      'buffered',
      fakeTimeRanges([
        [0, 4],
        [9.9, 20],
      ]),
    );
    v.currentTime = 10;
    expect(bufferedAhead(v)).toBe(10);
    v.currentTime = 30;
    expect(bufferedAhead(v)).toBe(0);
  });

  it('holds the first play until the runway exists (a 2 s pre-roll burst is not enough), then plays once', () => {
    const v = video(0.5);
    const play = vi.spyOn(v, 'play');
    const pause = vi.spyOn(v, 'pause');
    defineReadOnly(v, 'paused', false);
    const gate = new BufferGate(v, thresholdsFor('Small'));
    gate.onPlay();
    expect(gate.current).toEqual({ kind: 'Starting' });
    expect(pause).toHaveBeenCalledTimes(1);
    expect(gate.holding).toBe(true);
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 12.5]]));
    gate.onProgress();
    expect(gate.current).toEqual({ kind: 'Starting' });
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 16]]));
    gate.onProgress();
    expect(gate.current).toEqual({ kind: 'Playing' });
    expect(play).toHaveBeenCalledTimes(1);
    expect(gate.holding).toBe(false);
  });

  it('a stall waits for the runway again; the gate-issued pause is not a user pause', () => {
    const v = video(6);
    defineReadOnly(v, 'paused', false);
    const gate = new BufferGate(v, thresholdsFor('Small'));
    gate.onPlay();
    expect(gate.current.kind).toBe('Playing');
    v.currentTime = 12;
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 12.2]]));
    gate.onWaiting();
    expect(gate.current).toEqual({ kind: 'Holding' });
    gate.onPause(); // the pause event our own pause() raised
    expect(gate.current.kind).toBe('Holding');
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 16]]));
    gate.onProgress();
    expect(gate.current.kind).toBe('Holding');
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 18.5]]));
    gate.onProgress();
    expect(gate.current.kind).toBe('Playing');
  });

  it('a user pause is respected until the user plays again', () => {
    const v = video(6);
    defineReadOnly(v, 'paused', false);
    const gate = new BufferGate(v, thresholdsFor('Small'));
    gate.onPlay();
    gate.onPause();
    expect(gate.current).toEqual({ kind: 'UserPaused' });
    expect(gate.holding).toBe(false);
    gate.onProgress();
    expect(gate.current.kind).toBe('UserPaused');
    gate.onPlay();
    expect(gate.current.kind).toBe('Playing');
  });

  it('attachBufferGate wires the element events and detaches cleanly', () => {
    const v = video(0.2);
    const { gate, detach } = attachBufferGate(v, thresholdsFor('Small'));
    fire(v, 'play');
    expect(gate.current.kind).toBe('Starting');
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 20]]));
    fire(v, 'progress');
    expect(gate.current.kind).toBe('Playing');
    fire(v, 'waiting');
    expect(gate.current.kind).toBe('Holding');
    detach();
    fire(v, 'timeupdate');
    expect(gate.current.kind).toBe('Holding');
  });

  it('a finite file buffered to its end plays out even below the runway', () => {
    const v = video(0.4, 29);
    defineReadOnly(v, 'duration', 29.5);
    defineReadOnly(v, 'paused', false);
    expect(bufferedToEnd(v)).toBe(true);
    const gate = new BufferGate(v, thresholdsFor('Small'));
    gate.onPlay();
    expect(gate.current.kind).toBe('Playing');
    gate.onWaiting();
    expect(gate.current.kind).toBe('Holding');
    gate.onProgress();
    expect(gate.current.kind).toBe('Playing');
    const live = video(0.4);
    defineReadOnly(live, 'duration', Number.POSITIVE_INFINITY);
    expect(bufferedToEnd(live)).toBe(false);
  });
});
