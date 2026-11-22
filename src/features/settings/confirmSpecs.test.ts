import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TellyDb } from '@/core/db/tellyDb';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { confirmSpecFor, runConfirmPrimary } from './confirmSpecs';
import { SettingsController } from './settingsController';
import type { SettingsDeps } from './settingsDeps';
import { EMPTY_FEEDS } from './settingsFeeds';
import { fakeDeps } from './settingsTestSupport';

const URL = 'http://p/list.m3u';

describe('confirm specs', () => {
  let db: TellyDb;
  let deps: SettingsDeps;
  let c: SettingsController;

  beforeEach(async () => {
    db = freshDb();
    deps = fakeDeps(db, { clearSearchHistory: vi.fn() });
    await deps.playlists.add(
      URL,
      { epgUrl: null, channels: [channelImport('News One')], vodItems: [] },
      'P',
      () => 1,
    );
    c = new SettingsController(deps);
  });

  it('words every confirm like the captured GuidedStep', () => {
    expect(confirmSpecFor({ kind: 'ConfirmDelete', url: URL, name: '10.0.2.2' })).toEqual({
      title: 'Delete playlist?',
      body: 'All channels from the playlist "10.0.2.2" will no longer be available',
      primary: 'Delete',
    });
    expect(confirmSpecFor({ kind: 'ConfirmDeleteSource', sourceId: 1, name: 'alt' })?.title).toBe(
      'Delete EPG source?',
    );
    expect(confirmSpecFor({ kind: 'ConfirmDeleteReminder', reminderId: 1, title: 'Show' })?.body).toContain(
      '"Show"',
    );
    expect(confirmSpecFor({ kind: 'ConfirmClearVodPositions' })?.primary).toBe('Clear');
    expect(confirmSpecFor({ kind: 'ConfirmDeleteRecordings' })?.title).toBe('Delete all recordings?');
    expect(confirmSpecFor({ kind: 'ConfirmClearHistory' })?.primary).toBe('Clear');
    expect(confirmSpecFor({ kind: 'PinSetup', armsParental: false })).toBeNull();
  });

  it('runs each primary action against the stores and closes the overlay', async () => {
    const sourceId = await deps.epgSources.add(URL, 'http://alt/epg.xml', 1);
    const reminderId = await deps.reminders.upsert({ channelId: 1, title: 'Show', startMs: 5, stopMs: 6 });
    await deps.vod.savePosition({ itemKey: 'k', positionMs: 1, durationMs: 2, updatedAtMs: 3 });
    await deps.recordings.insert({
      channelKey: 'k',
      channelName: 'N',
      streamUrl: 'u',
      title: 't',
      filePath: 'f',
      startMs: 1,
      plannedEndMs: 2,
      endMs: null,
      status: 'DONE',
      sizeBytes: 9,
    });
    c.ui.set({
      panes: [{ kind: 'EpgSources' }, { kind: 'EpgSourceDetail', sourceId }],
      overlay: { kind: 'ConfirmDeleteSource', sourceId, name: 'alt' },
    });
    await runConfirmPrimary(c);
    expect(await deps.epgSources.all()).toEqual([]);
    expect(c.state.panes).toEqual([{ kind: 'EpgSources' }]);
    c.showOverlay({ kind: 'ConfirmDeleteReminder', reminderId, title: 'Show' });
    await runConfirmPrimary(c);
    expect(await deps.reminders.upcoming()).toEqual([]);
    c.showOverlay({ kind: 'ConfirmClearVodPositions' });
    await runConfirmPrimary(c);
    expect(await deps.vod.positions()).toEqual([]);
    c.showOverlay({ kind: 'ConfirmDeleteRecordings' });
    await runConfirmPrimary(c);
    expect(await deps.recordings.all()).toEqual([]);
    c.showOverlay({ kind: 'ConfirmClearHistory' });
    await runConfirmPrimary(c);
    expect(deps.clearSearchHistory).toHaveBeenCalled();
    c.showOverlay({ kind: 'ConfirmDelete', url: URL, name: 'P' });
    await runConfirmPrimary(c);
    expect(await deps.playlists.all()).toEqual([]);
    expect(c.state.overlay).toBeNull();
    c.setFeeds(EMPTY_FEEDS);
    await runConfirmPrimary(c);
  });

  it('ignores primaries whose overlay is not open', async () => {
    const { confirmClearHistory, confirmClearVodPositions, confirmDeleteRecordings, confirmDeleteReminder } =
      await import('./settingsListActions');
    const { confirmDeleteEpgSource } = await import('./settingsEpgSourceActions');
    confirmClearHistory(c);
    await confirmClearVodPositions(c);
    await confirmDeleteRecordings(c);
    await confirmDeleteReminder(c);
    await confirmDeleteEpgSource(c);
    expect(deps.clearSearchHistory).not.toHaveBeenCalled();
  });
});
