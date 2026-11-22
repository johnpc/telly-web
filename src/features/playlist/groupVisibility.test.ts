import { describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { TellyDb, VISIBILITY_EPOCH_KEY } from '@/core/db/tellyDb';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { installGroupVisibility } from './groupVisibility';
import { playlistGroupEnabledSetting } from './playlistSettings';

describe('installGroupVisibility', () => {
  it('drops channels of disabled groups from visible() and bumps the epoch on change', async () => {
    const db = new TellyDb(`gv-${Math.random()}`);
    const channels = new ChannelRepository(db);
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const id = await db.playlists.add({
      name: 'p',
      url: 'http://p',
      epgUrl: null,
      lastUpdatedMs: 0,
      epgLastUpdatedMs: 0,
      epgFailedAtMs: 0,
    });
    const base = {
      playlistId: id,
      hidden: false,
      favorite: false,
      favoriteOrder: 0,
      blocked: false,
      logoUrl: null,
      tvgId: null,
      catchupType: null,
      catchupSource: null,
      catchupDays: null,
      customName: null,
      audioDecoder: null,
      videoDecoder: null,
      epgOffsetMinutes: 0,
      externalPlayer: null,
      epgOverride: null,
    };
    await db.channels.bulkAdd([
      { ...base, number: 1, sortIndex: 1, name: 'A', groupTitle: 'News', streamUrl: 'a' },
      { ...base, number: 2, sortIndex: 2, name: 'B', groupTitle: 'Music', streamUrl: 'b' },
      { ...base, number: 3, sortIndex: 3, name: 'C', groupTitle: null, streamUrl: 'c' },
    ]);
    const stop = installGroupVisibility(settings, channels, db);
    expect((await channels.visible()).map((c) => c.name)).toEqual(['A', 'B', 'C']);
    settings.set(playlistGroupEnabledSetting('http://p', 'Music'), false);
    expect((await channels.visible()).map((c) => c.name)).toEqual(['A', 'C']);
    await new Promise((r) => setTimeout(r, 10));
    expect(await db.meta.get(VISIBILITY_EPOCH_KEY)).toBeDefined();
    const epoch = (await db.meta.get(VISIBILITY_EPOCH_KEY))?.value;
    settings.set(playlistGroupEnabledSetting('http://p', 'Music'), false);
    await new Promise((r) => setTimeout(r, 10));
    expect((await db.meta.get(VISIBILITY_EPOCH_KEY))?.value).toBe(epoch);
    stop();
    db.close();
  });
});
