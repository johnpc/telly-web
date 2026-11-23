import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BufferGate, attachBufferGate, bufferedAhead, thresholdsFor } from './bufferGate';
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
    expect(thresholdsFor('Small')).toEqual({ startAheadSec: 1.5, resumeAheadSec: 5 });
    expect(thresholdsFor('Large')).toEqual({ startAheadSec: 2.5, resumeAheadSec: 10 });
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

  it('holds the first play until the start runway exists, then plays once', () => {
    const v = video(0.5);
    const play = vi.spyOn(v, 'play');
    const pause = vi.spyOn(v, 'pause');
    defineReadOnly(v, 'paused', false);
    const gate = new BufferGate(v, thresholdsFor('Small'));
    gate.onPlay();
    expect(gate.current).toEqual({ kind: 'Starting', need: 1.5 });
    expect(pause).toHaveBeenCalledTimes(1);
    expect(gate.holding).toBe(true);
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 12]]));
    gate.onProgress();
    expect(gate.current).toEqual({ kind: 'Playing' });
    expect(play).toHaveBeenCalledTimes(1);
    expect(gate.holding).toBe(false);
  });

  it('a stall waits for the longer runway; the gate-issued pause is not a user pause', () => {
    const v = video(6);
    defineReadOnly(v, 'paused', false);
    const gate = new BufferGate(v, thresholdsFor('Small'));
    gate.onPlay();
    expect(gate.current.kind).toBe('Playing');
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 10.2]]));
    gate.onWaiting();
    expect(gate.current).toEqual({ kind: 'Holding', need: 5 });
    gate.onPause(); // the pause event our own pause() raised
    expect(gate.current.kind).toBe('Holding');
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 14]]));
    gate.onProgress();
    expect(gate.current.kind).toBe('Holding');
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 15.5]]));
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
});
