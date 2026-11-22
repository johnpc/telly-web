import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { type GuideKey, commandFor, guideKeyOf } from './guideKeyPolicy';
import { DEFAULT_KEYMAP, type GuideKeymap, keymapFrom } from './guideKeymap';
import { GRID, GROUPS, ROW_MENU } from './guideLayer';

const grid = (key: GuideKey, keymap: GuideKeymap = DEFAULT_KEYMAP): string =>
  JSON.stringify(commandFor(GRID, key, keymap));

describe('guideKeyOf', () => {
  it('maps remote keys, RW/FF standing in for the day-jump holds', () => {
    expect(guideKeyOf('REWIND')).toBe('LONG_LEFT');
    expect(guideKeyOf('FAST_FORWARD')).toBe('LONG_RIGHT');
    expect(guideKeyOf('OK')).toBe('OK');
    expect(guideKeyOf('PLAY_PAUSE')).toBeNull();
    expect(guideKeyOf({ kind: 'DIGIT', digit: 3 })).toBeNull();
  });
});

describe('commandFor', () => {
  it('maps the grid keys with the default keymap', () => {
    expect(grid('LEFT')).toBe('{"kind":"FocusLeft"}');
    expect(grid('RIGHT')).toBe('{"kind":"FocusRight"}');
    expect(grid('UP')).toBe('{"kind":"FocusUp"}');
    expect(grid('DOWN')).toBe('{"kind":"FocusDown"}');
    expect(grid('OK')).toBe('{"kind":"Activate"}');
    expect(grid('LONG_OK')).toBe('{"kind":"OpenCellMenu"}');
    expect(grid('MENU')).toBe('{"kind":"OpenRowMenu"}');
    expect(grid('BACK')).toBe('{"kind":"OpenGroups"}');
    expect(grid('LONG_LEFT')).toBe('{"kind":"DayJump","days":-1}');
    expect(grid('LONG_RIGHT')).toBe('{"kind":"DayJump","days":1}');
    expect(commandFor(GRID, 'CHANNEL_UP', DEFAULT_KEYMAP)).toBeNull();
  });
  it('honours the Remote control → TV guide remaps', () => {
    const remap: GuideKeymap = {
      leftRight: 'Move by page',
      channelUpDown: 'Page the channel list',
      longOk: 'Play channel',
    };
    expect(grid('LEFT', remap)).toBe('{"kind":"PageJump","direction":-1}');
    expect(grid('RIGHT', remap)).toBe('{"kind":"PageJump","direction":1}');
    expect(grid('CHANNEL_UP', remap)).toBe('{"kind":"PageRows","direction":-1}');
    expect(grid('CHANNEL_DOWN', remap)).toBe('{"kind":"PageRows","direction":1}');
    expect(grid('LONG_OK', remap)).toBe('{"kind":"Activate"}');
    const byDay: GuideKeymap = { ...DEFAULT_KEYMAP, channelUpDown: 'Move by day' };
    expect(grid('CHANNEL_UP', byDay)).toBe('{"kind":"DayJump","days":1}');
    expect(grid('CHANNEL_DOWN', byDay)).toBe('{"kind":"DayJump","days":-1}');
  });
  it('closes the groups column on RIGHT and every other layer on BACK only', () => {
    expect(commandFor(GROUPS, 'RIGHT', DEFAULT_KEYMAP)).toEqual({ kind: 'CloseLayer' });
    expect(commandFor(GROUPS, 'BACK', DEFAULT_KEYMAP)).toBeNull();
    expect(commandFor(ROW_MENU, 'BACK', DEFAULT_KEYMAP)).toEqual({ kind: 'CloseLayer' });
    expect(commandFor(ROW_MENU, 'OK', DEFAULT_KEYMAP)).toBeNull();
  });
});

describe('keymapFrom', () => {
  it('reads the picker labels and falls back on unknown values', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    expect(keymapFrom(settings)).toEqual(DEFAULT_KEYMAP);
    settings.set(TellySettings.REMOTE_GUIDE_LEFT_RIGHT, 'Move by page');
    settings.set(TellySettings.REMOTE_GUIDE_CHANNEL_UP_DOWN, 'bogus');
    settings.set(TellySettings.REMOTE_GUIDE_LONG_OK, 'Play channel');
    expect(keymapFrom(settings)).toEqual({
      leftRight: 'Move by page',
      channelUpDown: 'Nothing',
      longOk: 'Play channel',
    });
  });
});
