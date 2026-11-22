import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { SEARCH_HISTORY_KEY } from '@/features/search/searchHistory';
import { STORAGE_PREFIX } from '@/core/kv/localStorageKeyValueStore';
import { appVersionName, defaultSettingsDeps, noopCallbacks } from './settingsDeps';

describe('defaultSettingsDeps', () => {
  it('wires the production graph, honours overrides and reads the Vite version', async () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const deps = defaultSettingsDeps(settings, noopCallbacks, { versionName: 'x' });
    expect(deps.versionName).toBe('x');
    expect(deps.parental.isEnabled).toBe(false);
    expect(await deps.updatePlaylist('http://127.0.0.1:1/nope.m3u')).toBe(false);
    expect(await deps.changePlaylistUrl('http://none', 'http://none2')).toBe(false);
    expect(await deps.updateEpgNow()).toBe(0);
    localStorage.setItem(`${STORAGE_PREFIX}${SEARCH_HISTORY_KEY}`, 'q');
    deps.clearSearchHistory();
    expect(localStorage.getItem(`${STORAGE_PREFIX}${SEARCH_HISTORY_KEY}`)).toBeNull();
    expect(appVersionName({})).toBe('dev');
    expect(appVersionName({ VITE_APP_VERSION: '1.0' })).toBe('1.0');
    expect(typeof appVersionName()).toBe('string');
    noopCallbacks.onAddPlaylist();
    noopCallbacks.onExportBackup('');
    noopCallbacks.onImportBackup();
    noopCallbacks.onOpenPrivacyPolicy();
  });
});
