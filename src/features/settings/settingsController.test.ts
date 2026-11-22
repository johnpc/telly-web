import { beforeEach, describe, expect, it } from 'vitest';
import { TellySettings } from '@/core/settings/tellySettings';
import type { TellyDb } from '@/core/db/tellyDb';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { RowIds } from './rowIds';
import { SettingsController } from './settingsController';
import type { SettingsDeps } from './settingsDeps';
import { EMPTY_FEEDS } from './settingsFeeds';
import { fakeDeps, flush } from './settingsTestSupport';
import { RefreshRunner } from './refreshStatus';

const URL = 'http://p/list.m3u';

describe('SettingsController', () => {
  let db: TellyDb;
  let deps: SettingsDeps;
  let c: SettingsController;

  beforeEach(async () => {
    db = freshDb();
    deps = fakeDeps(db);
    await deps.playlists.add(
      URL,
      { epgUrl: null, channels: [channelImport('News One')], vodItems: [] },
      'P',
      () => 1,
    );
    c = new SettingsController(deps, new RefreshRunner({ set: () => undefined }));
    c.setFeeds({
      ...EMPTY_FEEDS,
      playlists: [{ url: URL, name: 'P', channelCount: 1, epgUrl: null, groups: ['News'] }],
    });
  });

  it('opens a section in place, flips toggles, opens pickers and pops back one sheet at a time', () => {
    c.activate(`${RowIds.SECTION_PREFIX}EPG`);
    expect(c.state.panes).toEqual([{ kind: 'Section', section: 'EPG' }]);
    c.activate(RowIds.EPG_UPDATE_ON_APP_START);
    expect(deps.settings.get(TellySettings.EPG_UPDATE_ON_APP_START)).toBe(true);
    c.activate(RowIds.EPG_UPDATE_INTERVAL);
    expect(c.state.overlay).toMatchObject({ kind: 'Picker', current: '0' });
    expect(c.back()).toBe(true);
    expect(c.state.overlay).toBeNull();
    expect(c.back()).toBe(true);
    expect(c.state.panes).toEqual([]);
    expect(c.back()).toBe(false);
    c.activate(`${RowIds.SECTION_PREFIX}bogus`);
    expect(c.state.panes).toEqual([]);
  });

  it('pushes playlist and EPG source detail panes and knows the current playlist', () => {
    c.activate(`${RowIds.PLAYLIST_PREFIX}${URL}`);
    expect(c.currentDetailUrl()).toBe(URL);
    expect(c.currentDetailItem()?.name).toBe('P');
    c.activate(`${RowIds.EPG_CUSTOM_SOURCE_PREFIX}7`);
    expect(c.state.panes[1]).toEqual({ kind: 'EpgSourceDetail', sourceId: 7 });
    expect(c.currentDetailUrl()).toBeNull();
    expect(c.currentDetailItem()).toBeNull();
  });

  it('turns parental controls on only through PIN setup when no PIN exists', async () => {
    c.activate(RowIds.PARENTAL_MASTER);
    expect(c.state.overlay).toEqual({ kind: 'PinSetup', armsParental: true });
    expect(deps.parental.isEnabled).toBe(false);
    c.back();
    expect(deps.parental.isEnabled).toBe(false);
    await deps.parental.setPin('2468');
    c.activate(RowIds.PARENTAL_MASTER);
    expect(deps.parental.isEnabled).toBe(true);
    c.activate(RowIds.PARENTAL_MASTER);
    expect(deps.parental.isEnabled).toBe(false);
  });

  it('gates the sheet behind the PIN when Settings is locked, and BACK leaves', async () => {
    await deps.parental.setPin('2468');
    deps.parental.setEnabled(true);
    deps.settings.set(TellySettings.PARENTAL_REQUIRE_FOR_SETTINGS, true);
    const gated = new SettingsController(deps);
    expect(gated.state.overlay).toEqual({ kind: 'PinVerify', target: 'SETTINGS' });
    expect(gated.back()).toBe(false);
    deps.settings.set(TellySettings.PARENTAL_REQUIRE_FOR_PLAYLISTS, true);
    gated.dismissOverlay();
    gated.activate(`${RowIds.SECTION_PREFIX}PLAYLISTS`);
    expect(gated.state.overlay).toEqual({ kind: 'PinVerify', target: 'PLAYLISTS' });
    expect(gated.state.panes).toEqual([]);
  });

  it('asks before deleting a reminder and unblocks a blocked channel on OK', async () => {
    const channels = await deps.channels.all();
    const channel = channels[0];
    if (channel === undefined) throw new Error('no channel');
    await deps.channels.updateFlags(channel.id, { blocked: true });
    c.setFeeds({
      ...c.feeds,
      reminders: [{ id: 3, title: 'Show', channelName: 'N', airTime: '1' }],
      blockedChannels: [{ ...channel, blocked: true }],
    });
    c.activate(`${RowIds.REMINDER_PREFIX}3`);
    expect(c.state.overlay).toEqual({ kind: 'ConfirmDeleteReminder', reminderId: 3, title: 'Show' });
    c.dismissOverlay();
    c.activate(`${RowIds.REMINDER_PREFIX}99`);
    expect(c.state.overlay).toBeNull();
    c.activate(`${RowIds.BLOCKED_CHANNEL_PREFIX}${channel.id}`);
    c.activate(`${RowIds.BLOCKED_CHANNEL_PREFIX}999`);
    await flush();
    expect((await deps.channels.byId(channel.id))?.blocked).toBe(false);
  });
});
