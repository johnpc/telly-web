import { beforeEach, describe, expect, it } from 'vitest';
import type { TellyDb } from '@/core/db/tellyDb';
import { TellySettings } from '@/core/settings/tellySettings';
import { playlistUserAgentSetting } from '@/features/playlist/playlistSettings';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { RowIds } from './rowIds';
import { SettingsController } from './settingsController';
import type { SettingsDeps } from './settingsDeps';
import { EMPTY_FEEDS } from './settingsFeeds';
import { choosePickerOption, submitPin, submitText, submitVerifyPin } from './settingsOverlayResults';
import { fakeDeps } from './settingsTestSupport';

const URL = 'http://p/list.m3u';

describe('overlay results', () => {
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
    c = new SettingsController(deps);
    c.setFeeds({
      ...EMPTY_FEEDS,
      playlists: [{ url: URL, name: 'P', channelCount: 1, epgUrl: null, groups: [] }],
    });
  });

  it('writes the picked raw and closes the picker; ignores picks without a picker', () => {
    choosePickerOption(c, '6');
    c.activate(RowIds.EPG_UPDATE_INTERVAL);
    choosePickerOption(c, '6');
    expect(deps.settings.get(TellySettings.EPG_UPDATE_INTERVAL_HOURS)).toBe(6);
    expect(c.state.overlay).toBeNull();
  });

  it('routes text commits to their rows', async () => {
    await submitText(c, 'nothing open');
    c.activate(RowIds.USER_AGENT);
    await submitText(c, ' telly-ua ');
    expect(deps.settings.get(TellySettings.USER_AGENT)).toBe('telly-ua');
    c.activate(RowIds.EPG_ADD_SOURCE);
    await submitText(c, 'http://alt/epg.xml');
    expect((await deps.epgSources.forPlaylist(URL)).map((s) => s.url)).toEqual(['http://alt/epg.xml']);
    c.activate(RowIds.EPG_ADD_SOURCE);
    await submitText(c, 'not a url');
    expect(await deps.epgSources.all()).toHaveLength(1);
    const source = (await deps.epgSources.all())[0];
    if (source === undefined) throw new Error('no source');
    c.setFeeds({ ...c.feeds, epgSources: [source] });
    c.push({ kind: 'EpgSourceDetail', sourceId: source.id });
    c.activate(RowIds.EPG_SOURCE_URL);
    expect(c.state.overlay).toMatchObject({ kind: 'TextEdit', value: 'http://alt/epg.xml' });
    await submitText(c, 'https://alt2/epg.xml');
    expect((await deps.epgSources.all())[0]?.url).toBe('https://alt2/epg.xml');
    c.ui.set({ panes: [{ kind: 'PlaylistDetail', url: URL }], overlay: null });
    c.activate(RowIds.PLAYLIST_USER_AGENT);
    await submitText(c, 'pl-ua');
    expect(deps.settings.get(playlistUserAgentSetting(URL))).toBe('pl-ua');
    c.activate(RowIds.PLAYLIST_NAME);
    await submitText(c, 'Living room');
    expect((await deps.playlists.byUrl(URL))?.name).toBe('Living room');
    c.showOverlay({ kind: 'TextEdit', rowId: 'unknown', title: 't', value: '', playlistUrl: URL });
    await submitText(c, 'x');
    expect(c.state.overlay).toBeNull();
  });

  it('commits a PIN, arming parental controls only for the first-time setup', async () => {
    await submitPin(c, '1111');
    expect(deps.parental.hasPin).toBe(false);
    c.showOverlay({ kind: 'PinSetup', armsParental: true });
    await submitPin(c, '');
    expect(deps.parental.hasPin).toBe(false);
    expect(deps.parental.isEnabled).toBe(false);
    c.showOverlay({ kind: 'PinSetup', armsParental: true });
    await submitPin(c, '2468');
    expect(deps.parental.hasPin).toBe(true);
    expect(deps.parental.isEnabled).toBe(true);
    expect(await deps.parental.verifyPin('2468')).toBe(true);
  });

  it('verifies a PIN and opens what its target names', async () => {
    await deps.parental.setPin('2468');
    expect(await submitVerifyPin(c, '2468')).toBe(false);
    c.showOverlay({ kind: 'PinVerify', target: 'PLAYLISTS' });
    expect(await submitVerifyPin(c, '0000')).toBe(false);
    expect(c.state.overlay).toEqual({ kind: 'PinVerify', target: 'PLAYLISTS' });
    expect(await submitVerifyPin(c, '2468')).toBe(true);
    expect(c.state.panes).toEqual([{ kind: 'Section', section: 'PLAYLISTS' }]);
    c.showOverlay({ kind: 'PinVerify', target: 'BLOCKED_CHANNELS' });
    await submitVerifyPin(c, '2468');
    expect(c.state.panes.at(-1)).toEqual({ kind: 'BlockedChannels' });
    c.showOverlay({ kind: 'PinVerify', target: 'SETTINGS' });
    await submitVerifyPin(c, '2468');
    expect(c.state.overlay).toBeNull();
  });
});
