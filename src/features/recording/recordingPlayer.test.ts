import { type Mock, describe, expect, it, vi } from 'vitest';
import type { EngineState } from '@/core/player';
import {
  SEEK_STEP_MS,
  onCapturePlayerKey,
  progressFraction,
  toggleCapturePlayback,
  transportForCapture,
  transportText,
} from './recordingPlayer';

interface FakePlayer {
  state: EngineState;
  paused: boolean;
  positionMs: number;
  seekTo: Mock<(positionMs: number) => void>;
  play: Mock<() => void>;
  pause: Mock<() => void>;
}

function playerOf(state: EngineState = { kind: 'Playing' }, paused = false, positionMs = 30_000): FakePlayer {
  return {
    state,
    paused,
    positionMs,
    seekTo: vi.fn<(positionMs: number) => void>(),
    play: vi.fn<() => void>(),
    pause: vi.fn<() => void>(),
  };
}

describe('recordingPlayer', () => {
  it('plays .mp4 captures natively and everything else through mpegts.js', async () => {
    expect((await transportForCapture('HLS_Live-1.mp4')('blob:x')).kind).toBe('native');
    expect((await transportForCapture('News_One-1.ts')('blob:x')).kind).toBe('mpegts');
  });

  it('formats the transport readout and progress, tolerating an unknown duration', () => {
    expect(transportText(16_000, 2_700_000)).toBe('00:16 / 45:00');
    expect(transportText(0, Number.POSITIVE_INFINITY)).toBe('00:00 / 00:00');
    expect(progressFraction(30_000, 60_000)).toBe(0.5);
    expect(progressFraction(90_000, 60_000)).toBe(1);
    expect(progressFraction(10, 0)).toBe(0);
    expect(progressFraction(10, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('OK pauses, resumes, and replays from the start once the capture ended', () => {
    const playing = playerOf();
    toggleCapturePlayback(playing);
    expect(playing.pause).toHaveBeenCalled();
    const paused = playerOf({ kind: 'Playing' }, true);
    toggleCapturePlayback(paused);
    expect(paused.play).toHaveBeenCalled();
    const ended = playerOf({ kind: 'Ended' });
    toggleCapturePlayback(ended);
    expect(ended.seekTo).toHaveBeenCalledWith(0);
    expect(ended.play).toHaveBeenCalled();
  });

  it('LEFT/RIGHT (and RW/FF) seek ±10 s clamped at zero; other keys fall through', () => {
    const player = playerOf({ kind: 'Playing' }, false, 5_000);
    expect(onCapturePlayerKey('LEFT', player)).toBe(true);
    expect(player.seekTo).toHaveBeenLastCalledWith(0);
    expect(onCapturePlayerKey('RIGHT', player)).toBe(true);
    expect(player.seekTo).toHaveBeenLastCalledWith(5_000 + SEEK_STEP_MS);
    expect(onCapturePlayerKey('REWIND', player)).toBe(true);
    expect(onCapturePlayerKey('FAST_FORWARD', player)).toBe(true);
    expect(onCapturePlayerKey('PLAY_PAUSE', player)).toBe(true);
    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(onCapturePlayerKey('OK', player)).toBe(true);
    expect(onCapturePlayerKey('BACK', player)).toBe(false);
    expect(onCapturePlayerKey('UP', player)).toBe(false);
    expect(onCapturePlayerKey({ kind: 'DIGIT', digit: 1 }, player)).toBe(false);
  });
});
