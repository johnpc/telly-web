import { describe, expect, it } from 'vitest';
import { VodRepository } from '@/core/db/vodRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { createEngine, VIDEO_TESTID } from '@/core/player';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { freshDb } from '@/test/dbFixtures';
import { createVodDeps, createVodEngine, defaultVodDeps } from './vodDeps';

describe('createVodDeps', () => {
  it('reads the remember toggle and the player timeout live from settings', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const deps = createVodDeps(settings, new VodRepository(freshDb()), () => createEngine());
    expect(deps.rememberPosition()).toBe(true);
    expect(deps.transportTimeoutMs()).toBe(5_000);
    settings.set(TellySettings.VOD_REMEMBER_POSITION, false);
    settings.set(TellySettings.PLAYER_PANEL_TIMEOUT_SEC, 8);
    expect(deps.rememberPosition()).toBe(false);
    expect(deps.transportTimeoutMs()).toBe(8_000);
    expect(typeof deps.clock()).toBe('number');
    expect(deps.resolveUrl('http://x/a.mp4')).toBe('http://x/a.mp4');
    settings.set(TellySettings.CORS_PROXY, 'https://p/?url=');
    expect(deps.resolveUrl('http://x/a.mp4')).toBe(`https://p/?url=${encodeURIComponent('http://x/a.mp4')}`);
  });

  it('createVodEngine hands out a fresh engine with its own attached video', () => {
    const engine = createVodEngine();
    expect(engine.video?.dataset['testid']).toBe(VIDEO_TESTID);
    expect(engine).not.toBe(createVodEngine());
    engine.release();
  });

  it('the default deps are wired to the shared repository', async () => {
    expect(await defaultVodDeps.items.items()).toEqual([]);
    expect(defaultVodDeps.rememberPosition()).toBe(true);
  });
});
