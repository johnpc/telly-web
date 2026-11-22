import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { playlistKeyMoves, rekeyPlaylistSettings } from './playlistKeyMigration';
import {
  PLAYLIST_UPDATE_INTERVAL_HOURS,
  playlistEnabledSetting,
  playlistGroupEnabledSetting,
  playlistUpdateIntervalSetting,
  playlistUpdateOnStartSetting,
  playlistUserAgentSetting,
} from './playlistSettings';

describe('playlistSettings', () => {
  it('uses the Android per-playlist keys and defaults', () => {
    expect(playlistEnabledSetting('u')).toMatchObject({ key: 'playlist_enabled:u', default: true });
    expect(playlistUserAgentSetting('u')).toMatchObject({ key: 'playlist_user_agent:u', default: '' });
    expect(playlistUpdateIntervalSetting('u')).toMatchObject({
      key: 'playlist_update_interval:u',
      default: 0,
    });
    expect(playlistUpdateOnStartSetting('u')).toMatchObject({
      key: 'playlist_update_on_start:u',
      default: false,
    });
    expect(playlistGroupEnabledSetting('u', 'News')).toMatchObject({
      key: 'playlist_group_enabled:u:News',
      default: true,
    });
    expect(PLAYLIST_UPDATE_INTERVAL_HOURS).toEqual([0, 1, 2, 4, 8, 12, 24]);
  });

  it('computes and applies the URL re-key moves', () => {
    const snapshot = {
      'playlist_enabled:old': 'false',
      'playlist_update_interval:old': '4',
      'playlist_group_enabled:old:News': 'false',
      'playlist_group_enabled:old:a:b': 'true',
      'playlist_enabled:other': 'true',
      'playlist_group_enabled:older:News': 'true',
      unrelated: 'x',
    };
    const moves = playlistKeyMoves(snapshot, 'old', 'new');
    expect(moves).toEqual([
      { from: 'playlist_enabled:old', to: 'playlist_enabled:new', value: 'false' },
      { from: 'playlist_update_interval:old', to: 'playlist_update_interval:new', value: '4' },
      { from: 'playlist_group_enabled:old:News', to: 'playlist_group_enabled:new:News', value: 'false' },
      { from: 'playlist_group_enabled:old:a:b', to: 'playlist_group_enabled:new:a:b', value: 'true' },
    ]);
    const settings = new SettingsRepository(new MemoryKeyValueStore(snapshot));
    rekeyPlaylistSettings(settings, 'old', 'new');
    expect(settings.snapshot()).toEqual({
      'playlist_enabled:new': 'false',
      'playlist_update_interval:new': '4',
      'playlist_group_enabled:new:News': 'false',
      'playlist_group_enabled:new:a:b': 'true',
      'playlist_enabled:other': 'true',
      'playlist_group_enabled:older:News': 'true',
      unrelated: 'x',
    });
  });
});
