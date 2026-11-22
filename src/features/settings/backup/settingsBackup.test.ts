import { describe, expect, it } from 'vitest';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { SettingsBackupManager, restoreBackup } from './settingsBackup';

describe('SettingsBackupManager', () => {
  it('exports settings + playlist identities and restores them with a re-fetch', async () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    settings.set(TellySettings.CONFIRM_EXIT, true);
    const playlists = new PlaylistRepository(freshDb());
    const manager = new SettingsBackupManager(settings, playlists, () => 7);
    expect(await manager.exportJsonIfAny()).toBeNull();
    await playlists.add(
      'http://p/l.m3u',
      { epgUrl: 'http://p/e.xml', channels: [channelImport('A')], vodItems: [] },
      'P',
      () => 1,
    );
    const json = await manager.exportJson();
    expect(JSON.parse(json)).toEqual({
      version: 1,
      settings: { general_confirm_exit: 'true' },
      playlists: [{ name: 'P', url: 'http://p/l.m3u', epgUrl: 'http://p/e.xml' }],
    });
    expect(await manager.exportJsonIfAny()).toBe(json);

    const target = new SettingsRepository(new MemoryKeyValueStore({ stale: 'x' }));
    const targetPlaylists = new PlaylistRepository(freshDb());
    const targetManager = new SettingsBackupManager(target, targetPlaylists, () => 9);
    const fetched: string[] = [];
    expect(await restoreBackup(json, targetManager, async (url) => fetched.push(url) > 0)).toBe(true);
    expect(target.snapshot()).toEqual({ general_confirm_exit: 'true' });
    expect((await targetPlaylists.byUrl('http://p/l.m3u'))?.name).toBe('P');
    expect(fetched).toEqual(['http://p/l.m3u']);
    expect(await restoreBackup('not json', targetManager, async () => true)).toBe(false);
    expect(await targetManager.importJson('[]')).toBeNull();
  });
});
