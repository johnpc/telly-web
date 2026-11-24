import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BufferGate, attachBufferGate, bufferedAhead, bufferedToEnd, thresholdsFor } from './bufferGate';
import { BURST_RATIO, FillRate } from './bufferRunway';
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
    expect(thresholdsFor('Small')).toEqual({ startAheadSec: 2, resumeAheadSec: 6 });
    expect(thresholdsFor('Large')).toEqual({ startAheadSec: 8, resumeAheadSec: 12 });
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

  it('holds the first play until the start runway exists, then plays once (bursting pipe)', () => {
    const v = video(0.5);
    const play = vi.spyOn(v, 'play');
    const pause = vi.spyOn(v, 'pause');
    defineReadOnly(v, 'paused', false);
    let now = 0;
    const gate = new BufferGate(v, thresholdsFor('Small'), () => now);
    now = 300; // 2 s of media within 0.3 s: a bursting pipe
    gate.onPlay();
    expect(gate.current).toEqual({ kind: 'Starting', need: 2 });
    expect(pause).toHaveBeenCalledTimes(1);
    expect(gate.holding).toBe(true);
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 14]]));
    gate.onProgress();
    expect(gate.current).toEqual({ kind: 'Playing' });
    expect(play).toHaveBeenCalledTimes(1);
    expect(gate.holding).toBe(false);
  });

  it('a stall after real playback waits for the longer runway; the gate-issued pause is not a user pause', () => {
    const v = video(6);
    defineReadOnly(v, 'paused', false);
    const gate = new BufferGate(v, thresholdsFor('Small'));
    gate.onPlay();
    expect(gate.current.kind).toBe('Playing');
    v.currentTime = 10 + 2; // two seconds actually played
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 12.2]]));
    gate.onWaiting();
    expect(gate.current).toEqual({ kind: 'Holding', need: 6 });
    gate.onPause(); // the pause event our own pause() raised
    expect(gate.current.kind).toBe('Holding');
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 16]]));
    gate.onProgress();
    expect(gate.current.kind).toBe('Holding');
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 18.5]]));
    gate.onProgress();
    expect(gate.current.kind).toBe('Playing');
  });

  it('a pipe trickling at ~1× is held for the resume runway before the first frame; a user resume is not', () => {
    const v = video(0.5);
    defineReadOnly(v, 'paused', false);
    let now = 0;
    const gate = new BufferGate(v, thresholdsFor('Small'), () => now);
    gate.onPlay();
    gate.onPause(); // the pause event of the gate's own hold
    now = 2300; // 2 s of media took 2.3 s to arrive
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 12]]));
    gate.onProgress();
    expect(gate.current).toEqual({ kind: 'Starting', need: 6 });
    expect(gate.holding).toBe(true);
    gate.onPause();
    now = 7000;
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 16.1]]));
    gate.onProgress();
    expect(gate.current).toEqual({ kind: 'Playing' });
    v.pause(); // the user's pause
    gate.onPause();
    expect(gate.current).toEqual({ kind: 'UserPaused' });
    now = 60_000;
    defineReadOnly(v, 'buffered', fakeTimeRanges([[0, 13]]));
    gate.onPlay(); // resume: the clock restarts, 3 s already there counts as a burst
    expect(gate.current).toEqual({ kind: 'Playing' });
  });

  it('a finite file that is fully buffered is never held for the resume runway', () => {
    const v = video(1.9);
    defineReadOnly(v, 'duration', 12);
    let now = 0;
    const gate = new BufferGate(v, thresholdsFor('Small'), () => now);
    now = 5000;
    gate.onPlay();
    expect(gate.current).toEqual({ kind: 'Playing' });
  });

  it('FillRate: bursting when the media arrived faster than BURST_RATIO× realtime (or instantly)', () => {
    let now = 1000;
    const rate = new FillRate(() => now);
    expect(rate.bursting(0)).toBe(true);
    now = 2000;
    expect(rate.bursting(BURST_RATIO)).toBe(true);
    expect(rate.bursting(BURST_RATIO - 0.01)).toBe(false);
    rate.reset();
    expect(rate.bursting(0)).toBe(true);
    expect(new FillRate().bursting(100)).toBe(true);
  });

  it('a waiting right after start is start-up jitter: only the start runway is re-armed', () => {
    const v = video(2.5);
    defineReadOnly(v, 'paused', false);
    const gate = new BufferGate(v, thresholdsFor('Small'));
    gate.onPlay();
    expect(gate.current.kind).toBe('Playing');
    v.currentTime = 10.2;
    gate.onWaiting();
    expect(gate.current).toEqual({ kind: 'Holding', need: 2 });
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
