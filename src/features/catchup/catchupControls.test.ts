import { describe, expect, it, vi } from 'vitest';
import type { PlaybackOverlay } from '@/features/playback/overlay/playbackOverlay';
import { CatchupPause, type CatchupKeyHost, modeOf, routeCatchupKey } from './catchupControls';
import { DEFAULT_SEEK_KEYS } from './catchupKeyPolicy';
import { DEFAULT_SKIP } from './skipSteps';
import { HOUR, NOW, channelRow, request } from './testFixtures';

const NONE: PlaybackOverlay = { kind: 'None' };

describe('CatchupPause', () => {
  it('pauses + pins, resumes + re-shows, and is inert outside catch-up', () => {
    const engine = {
      paused: false,
      pause: vi.fn(() => (engine.paused = true)),
      play: vi.fn(() => (engine.paused = false)),
    };
    let active = false;
    const show = vi.fn();
    const pin = vi.fn();
    const pause = new CatchupPause(engine, () => active, show, pin);
    pause.toggle();
    expect(engine.pause).not.toHaveBeenCalled();
    active = true;
    pause.toggle();
    expect(pause.paused).toBe(true);
    expect(pin).toHaveBeenCalledTimes(1);
    pause.toggle();
    expect(pause.paused).toBe(false);
    expect(show).toHaveBeenCalledTimes(1);
  });
});

describe('routeCatchupKey', () => {
  function host(mode: CatchupKeyHost['mode'] = () => 'Playing') {
    return {
      mode,
      seekKeys: () => ({ ...DEFAULT_SEEK_KEYS, rwLive: true }),
      skip: () => DEFAULT_SKIP,
      seekBy: vi.fn(),
      rewindLive: vi.fn(),
      back: vi.fn(),
    };
  }
  it('executes seek, rewind-live and back; false for keys the policy declines', () => {
    const playing = host();
    expect(routeCatchupKey(playing, NONE, 'FAST_FORWARD')).toBe(true);
    expect(playing.seekBy).toHaveBeenCalledWith(30_000);
    expect(routeCatchupKey(playing, NONE, 'BACK')).toBe(true);
    expect(playing.back).toHaveBeenCalledTimes(1);
    expect(routeCatchupKey(playing, NONE, 'OK')).toBe(false);
    const live = host(() => 'LiveCapable');
    expect(routeCatchupKey(live, NONE, 'REWIND')).toBe(true);
    expect(live.rewindLive).toHaveBeenCalledWith(10_000);
    expect(
      routeCatchupKey(
        host(() => 'None'),
        NONE,
        'REWIND',
      ),
    ).toBe(false);
  });
});

describe('modeOf', () => {
  it('is Playing with a state, LiveCapable on a catch-up channel, else None', () => {
    const channel = channelRow(1);
    expect(modeOf({ request: request(channel, NOW - 2 * HOUR, NOW - HOUR), fromLive: false }, null)).toBe(
      'Playing',
    );
    expect(modeOf(null, channel)).toBe('LiveCapable');
    expect(modeOf(null, channelRow(2, { catchupType: null, catchupSource: null }))).toBe('None');
    expect(modeOf(null, null)).toBe('None');
  });
});
