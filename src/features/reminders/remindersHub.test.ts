import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { ReminderRepository } from '@/core/db/reminderRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { tellyDb } from '@/core/db/tellyDb';
import { channelImport } from '@/test/dbFixtures';
import { MINUTE_MS } from './reminderDue';
import { SharedTicks, createRemindersHub } from './remindersHub';

describe('remindersHub', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
  afterEach(async () => {
    vi.useRealTimers();
    await tellyDb.reminders.clear();
    await tellyDb.channels.clear();
  });

  it('shares one running ticker across hosts', () => {
    const stop = vi.fn();
    const begin = vi.fn(() => stop);
    const ticks = new SharedTicks(begin);
    const releaseA = ticks.start();
    const releaseB = ticks.start();
    expect(begin).toHaveBeenCalledTimes(1);
    expect(ticks.active).toBe(true);
    releaseA();
    expect(stop).not.toHaveBeenCalled();
    releaseB();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(ticks.active).toBe(false);
  });

  it('fires a due reminder into the popup with the channel display name, honoring the lead setting', async () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    settings.set(TellySettings.REMINDER_LEAD_MINUTES, 10);
    await tellyDb.playlists.put({
      id: 1,
      name: 'p',
      url: 'u',
      epgUrl: null,
      lastUpdatedMs: 0,
      epgLastUpdatedMs: 0,
      epgFailedAtMs: 0,
    });
    const channels = new ChannelRepository(tellyDb);
    await channels.replaceForPlaylist(1, [channelImport('News One')]);
    const channel = (await channels.all())[0];
    const now = Date.now();
    await new ReminderRepository(tellyDb).upsert({
      channelId: channel?.id ?? 0,
      title: 'Show',
      startMs: now + 8 * MINUTE_MS,
      stopMs: now + 60 * MINUTE_MS,
    });
    const hub = createRemindersHub(settings, { db: tellyDb, intervalMs: 1000, visibility: null });
    const stop = hub.start();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(hub.popup.popup?.channelName).toBe('News One'));
    expect(hub.popup.popup?.programmeTitle).toBe('Show');
    stop();
  });
});
