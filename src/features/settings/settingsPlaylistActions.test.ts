import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TellyDb } from '@/core/db/tellyDb';
import {
  playlistGroupEnabledSetting,
  playlistUpdateOnStartSetting,
  playlistUserAgentSetting,
} from '@/features/playlist/playlistSettings';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { RowIds } from './rowIds';
import { SettingsController } from './settingsController';
import type { SettingsDeps } from './settingsDeps';
import { EMPTY_FEEDS } from './settingsFeeds';
import {
  confirmDeletePlaylist,
  submitPlaylistName,
  submitPlaylistUrl,
  submitPlaylistUserAgent,
} from './settingsPlaylistActions';
import { allPlaylistsMessage, updateAllPlaylistsMessage } from './settingsRefreshActions';
import { fakeDeps, flush } from './settingsTestSupport';
import { RefreshRunner } from './refreshStatus';

const URL = 'http://p/list.m3u';

describe('playlist actions', () => {
  let db: TellyDb;
  let deps: SettingsDeps;
  let c: SettingsController;

  beforeEach(async () => {
    db = freshDb();
    deps = fakeDeps(db, { changePlaylistUrl: vi.fn(async () => true) });
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
    c.push({ kind: 'PlaylistDetail', url: URL });
  });

  it('runs the detail rows: toggles, pickers, editors, groups, update and delete confirm', async () => {
    c.activate(RowIds.PLAYLIST_UPDATE_ON_START);
    expect(deps.settings.get(playlistUpdateOnStartSetting(URL))).toBe(true);
    c.activate(RowIds.PLAYLIST_ENABLE);
    expect(deps.settings.get(playlistGroupEnabledSetting(URL, 'News'))).toBe(true);
    c.activate(RowIds.PLAYLIST_UPDATE_INTERVAL);
    expect(c.state.overlay).toMatchObject({
      kind: 'Picker',
      current: '0',
      spec: { key: `playlist_update_interval:${URL}` },
    });
    c.dismissOverlay();
    c.activate(RowIds.PLAYLIST_NAME);
    expect(c.state.overlay).toMatchObject({
      kind: 'TextEdit',
      title: 'Playlist name',
      value: 'P',
      playlistUrl: URL,
    });
    c.activate(RowIds.PLAYLIST_URL);
    expect(c.state.overlay).toMatchObject({ kind: 'TextEdit', value: URL });
    c.activate(RowIds.PLAYLIST_USER_AGENT);
    expect(c.state.overlay).toMatchObject({ kind: 'TextEdit', title: 'User-Agent', value: '' });
    c.dismissOverlay();
    c.activate(RowIds.PLAYLIST_UPDATE_NOW);
    await flush();
    expect(c.refresh.status.value).toEqual({ kind: 'message', text: 'Playlist updated' });
    c.activate(RowIds.PLAYLIST_MANAGE_GROUPS);
    c.activate(`${RowIds.PLAYLIST_GROUP_PREFIX}News`);
    expect(deps.settings.get(playlistGroupEnabledSetting(URL, 'News'))).toBe(false);
    c.back();
    c.activate(RowIds.PLAYLIST_DELETE);
    expect(c.state.overlay).toEqual({ kind: 'ConfirmDelete', url: URL, name: 'P' });
    await confirmDeletePlaylist(c);
    expect(c.state.panes).toEqual([]);
    expect(await deps.playlists.byUrl(URL)).toBeNull();
    c.activate(RowIds.PLAYLIST_DELETE);
    expect(c.state.overlay).toBeNull();
  });

  it('commits the per-playlist editors', async () => {
    await submitPlaylistName(c, URL, '  Living room ');
    expect((await deps.playlists.byUrl(URL))?.name).toBe('Living room');
    await submitPlaylistName(c, URL, '   ');
    expect((await deps.playlists.byUrl(URL))?.name).toBe(URL);
    submitPlaylistUserAgent(c, URL, ' ua ');
    expect(deps.settings.get(playlistUserAgentSetting(URL))).toBe('ua');
    await submitPlaylistUrl(c, URL, URL);
    await submitPlaylistUrl(c, URL, '');
    expect(deps.changePlaylistUrl).not.toHaveBeenCalled();
    c.push({ kind: 'PlaylistGroups', url: URL });
    await submitPlaylistUrl(c, URL, 'http://q/list.m3u');
    expect(c.state.panes).toEqual([
      { kind: 'PlaylistDetail', url: 'http://q/list.m3u' },
      { kind: 'PlaylistGroups', url: 'http://q/list.m3u' },
    ]);
  });

  it('keeps the URL when the change fails and folds "update all" into one message', async () => {
    const failing = fakeDeps(db, {
      changePlaylistUrl: async () => false,
      updatePlaylist: async (url) => url === URL,
    });
    const d = new SettingsController(failing);
    d.push({ kind: 'PlaylistDetail', url: URL });
    await submitPlaylistUrl(d, URL, 'http://q');
    expect(d.state.panes).toEqual([{ kind: 'PlaylistDetail', url: URL }]);
    d.setFeeds({
      ...EMPTY_FEEDS,
      playlists: [
        { url: URL, name: 'P', channelCount: 1, epgUrl: null, groups: [] },
        { url: 'x', name: 'X', channelCount: 0, epgUrl: null, groups: [] },
      ],
    });
    expect(await updateAllPlaylistsMessage(d)).toBe('Updated 1 of 2 playlists');
    expect(allPlaylistsMessage(2, 2)).toBe('Playlists updated');
    expect(allPlaylistsMessage(0, 2)).toBe('Playlist update failed');
    expect(allPlaylistsMessage(0, 0)).toBe('Playlist update failed');
    c.activate(RowIds.UPDATE_ALL_PLAYLISTS);
    await flush();
    expect(c.refresh.status.value).toEqual({ kind: 'message', text: 'Playlists updated' });
  });
});
