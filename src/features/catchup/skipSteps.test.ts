import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { seekKeysOf, skipFrom } from './catchupToggles';
import { DEFAULT_SKIP, DEFAULT_SKIP_RAW, parseSkipSteps, skipOf } from './skipSteps';

describe('skipSteps', () => {
  it('parses the preset tokens into millis and drops malformed ones', () => {
    expect(parseSkipSteps('10s / 30s / 1m / 5m')).toEqual([10_000, 30_000, 60_000, 300_000]);
    expect(parseSkipSteps('2h, junk, 15 s')).toEqual([7_200_000, 15_000]);
    expect(parseSkipSteps('nothing here')).toEqual(parseSkipSteps(DEFAULT_SKIP_RAW));
  });
  it('maps back = first step, forward = second (or first again)', () => {
    expect(skipOf([])).toBe(DEFAULT_SKIP);
    expect(skipOf([5_000])).toEqual({ backMs: 5_000, forwardMs: 5_000 });
    expect(skipOf([10_000, 30_000, 60_000])).toEqual({ backMs: 10_000, forwardMs: 30_000 });
  });
});

describe('catchupToggles', () => {
  it('reads the Remote-control seek toggles and the Playback skip steps live', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    expect(seekKeysOf(settings)).toEqual({
      rwFf: true,
      leftRight: false,
      downUp: false,
      rwLive: false,
      leftLive: false,
      downLive: false,
    });
    expect(skipFrom(settings)).toEqual({ backMs: 10_000, forwardMs: 30_000 });
    settings.set(TellySettings.SEEK_LEFT_RIGHT, true);
    settings.set(TellySettings.DOWN_REWINDS_LIVE, true);
    settings.set(TellySettings.SKIP_STEPS, '5s / 15s / 30s / 1m');
    expect(seekKeysOf(settings)).toMatchObject({ leftRight: true, downLive: true });
    expect(skipFrom(settings)).toEqual({ backMs: 5_000, forwardMs: 15_000 });
  });
});
