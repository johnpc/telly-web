import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { backgroundAlphaFor, guideStyleFrom, rowHeightFor } from './guideStyle';

describe('guideStyle', () => {
  it('scales the row pitch and maps the transparency labels', () => {
    expect(rowHeightFor(7)).toBe(39);
    expect(rowHeightFor(14)).toBe(19.5);
    expect(backgroundAlphaFor('90%')).toBe(0.9);
    expect(backgroundAlphaFor('Opaque')).toBe(1);
  });
  it('reads the Appearance settings', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    settings.set(TellySettings.GUIDE_VISIBLE_CHANNELS, 0);
    settings.set(TellySettings.GUIDE_TRANSPARENCY, '70%');
    settings.set(TellySettings.SHOW_CHANNEL_NUMBERS, false);
    expect(guideStyleFrom(settings)).toEqual({
      rowHeightDp: 273,
      backgroundAlpha: 0.7,
      showChannelNumbers: false,
      visibleRows: 1,
    });
  });
});
