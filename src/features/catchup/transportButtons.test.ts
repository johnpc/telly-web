import { describe, expect, it, vi } from 'vitest';
import { CLOCK_12H } from '@/core/time';
import type { PlaybackInfoData } from '@/features/playback/info/playbackInfo';
import { adaptCatchupInfo } from './catchupInfo';
import { DEFAULT_SKIP } from './skipSteps';
import {
  FORWARD_INDEX,
  PAUSE_FOCUS_ID,
  PAUSE_INDEX,
  PREVIOUS_INDEX,
  REWIND_INDEX,
  type TransportCatchup,
  transportAction,
  transportIcon,
  transportLabel,
} from './transportButtons';
import { HOUR, NOW, channelRow, request } from './testFixtures';

function controls(paused = false): TransportCatchup {
  return {
    paused,
    skip: DEFAULT_SKIP,
    onPause: vi.fn(),
    onSeek: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
  };
}

describe('transport buttons', () => {
  it('labels and icons flip only on the pause slot during catch-up', () => {
    expect(transportLabel(PAUSE_INDEX, 'Timeshift', null)).toBe('Timeshift');
    expect(transportLabel(PAUSE_INDEX, 'Timeshift', controls())).toBe('Pause');
    expect(transportLabel(PAUSE_INDEX, 'Timeshift', controls(true))).toBe('Resume');
    expect(transportLabel(PREVIOUS_INDEX, 'Previous programme', controls())).toBe('Previous programme');
    expect(transportIcon(PAUSE_INDEX, 'pause', controls(true))).toBe('play');
    expect(transportIcon(PAUSE_INDEX, 'pause', controls())).toBe('pause');
    expect(transportIcon(REWIND_INDEX, 'rewind', controls(true))).toBe('rewind');
    expect(PAUSE_FOCUS_ID).toBe('transport-2');
  });
  it('routes each slot: coming-soon live, real transport actions during catch-up', () => {
    const onFeature = vi.fn();
    transportAction(PAUSE_INDEX, 'Timeshift', onFeature, null);
    expect(onFeature).toHaveBeenCalledWith('Timeshift');
    const c = controls();
    transportAction(PREVIOUS_INDEX, 'x', onFeature, c);
    transportAction(REWIND_INDEX, 'x', onFeature, c);
    transportAction(PAUSE_INDEX, 'x', onFeature, c);
    transportAction(FORWARD_INDEX, 'x', onFeature, c);
    transportAction(4, 'x', onFeature, c);
    expect(c.onPrevious).toHaveBeenCalledTimes(1);
    expect(c.onSeek).toHaveBeenNthCalledWith(1, -10_000);
    expect(c.onPause).toHaveBeenCalledTimes(1);
    expect(c.onSeek).toHaveBeenNthCalledWith(2, 30_000);
    expect(c.onNext).toHaveBeenCalledTimes(1);
    expect(onFeature).toHaveBeenCalledTimes(1);
  });
});

describe('adaptCatchupInfo', () => {
  const live: PlaybackInfoData = {
    channelId: 1,
    number: 1,
    name: 'News One',
    logoUrl: null,
    group: 'News',
    clockText: 'now',
    title: 'Live show',
    timeRange: 'live range',
    remaining: '12 min',
    progressPermille: 500,
    description: 'desc',
    nextLine: 'next',
    badges: ['HD'],
    elapsed: '10:00',
    duration: '60:00',
  };
  it('swaps in the archive title, air times and position readout, keeping channel identity', () => {
    const r = request(channelRow(1), NOW - 2 * HOUR, NOW - HOUR, 'Archive show');
    const data = adaptCatchupInfo(live, r, 90_000, CLOCK_12H);
    expect(data).toMatchObject({
      name: 'News One',
      badges: ['HD'],
      title: 'Archive show',
      remaining: null,
      description: null,
      nextLine: null,
      progressPermille: 25,
      elapsed: '01:30',
      duration: '1:00:00',
    });
    expect(data.timeRange).toMatch(/\d{2}:\d{2}( [AP]M)? — \d{2}:\d{2} [AP]M/);
    expect(adaptCatchupInfo(live, { ...r, title: null }, 0, CLOCK_12H).title).toBe('Live show');
  });
});
