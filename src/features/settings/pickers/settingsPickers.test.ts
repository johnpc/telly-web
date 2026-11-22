import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { RowIds } from '../rowIds';
import { currentRaw, intervalLabel } from './pickerSpec';
import { pickersByRowId, playlistUpdateIntervalPicker } from './settingsPickers';

describe('SettingsPickers', () => {
  it('maps every picker row to its options and highlights the stored or default raw', () => {
    const epg = pickersByRowId.get(RowIds.EPG_UPDATE_INTERVAL) ?? pickersByRowId.values().next().value;
    if (epg === undefined) throw new Error('missing picker');
    expect(epg?.options.map((o) => o.label)).toEqual(['None', '1', '2', '3', '6', '12', '24']);
    const s = new SettingsRepository(new MemoryKeyValueStore());
    expect(currentRaw(epg, s)).toBe('0');
    s.set(TellySettings.EPG_UPDATE_INTERVAL_HOURS, 6);
    expect(currentRaw(epg, s)).toBe('6');
    expect(pickersByRowId.get(RowIds.APPEARANCE_COLOR_THEME)?.options[0]).toEqual({
      label: 'Dark  •  Blue',
      raw: 'Blue',
    });
    expect(pickersByRowId.get(RowIds.PLAYBACK_AFR)?.options.map((o) => o.raw)).toContain(
      'On (also switch refresh rate on stop)',
    );
    expect(pickersByRowId.get(RowIds.REMOTE_GUIDE_LEFT_RIGHT)?.defaultRaw).toBe('Move by programme');
    expect(pickersByRowId.get(RowIds.APPEARANCE_PLAYER_TRANSPARENCY)?.options[1]).toEqual({
      label: '10%',
      raw: '10',
    });
    expect(pickersByRowId.has(RowIds.PLAYLIST_UPDATE_INTERVAL)).toBe(false);
  });

  it('builds the per-playlist interval picker and labels intervals', () => {
    const spec = playlistUpdateIntervalPicker('http://p');
    expect(spec.key).toBe('playlist_update_interval:http://p');
    expect(spec.options.map((o) => o.label)).toEqual(['None', '1', '2', '4', '8', '12', '24']);
    expect(intervalLabel(0)).toBe('None');
    expect(intervalLabel(8)).toBe('8');
  });
});
