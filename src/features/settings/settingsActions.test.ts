import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TellySettings } from '@/core/settings/tellySettings';
import { freshDb } from '@/test/dbFixtures';
import { RowIds } from './rowIds';
import { SettingsController } from './settingsController';
import type { SettingsDeps } from './settingsDeps';
import { fakeDeps, flush } from './settingsTestSupport';
import { RefreshRunner } from './refreshStatus';

describe('runAction', () => {
  let deps: SettingsDeps;
  let c: SettingsController;

  beforeEach(() => {
    deps = fakeDeps(freshDb(), {
      callbacks: {
        onAddPlaylist: vi.fn(),
        onExportBackup: vi.fn(),
        onImportBackup: vi.fn(),
        onOpenPrivacyPolicy: vi.fn(),
      },
    });
    c = new SettingsController(deps, new RefreshRunner({ set: () => undefined }));
  });

  it('pushes sub-panes and opens the fixed overlays and text editors', () => {
    c.activate(RowIds.EPG_SOURCES);
    c.activate(RowIds.OTHER_RECORDING);
    c.activate(RowIds.APPEARANCE_LOGOS);
    expect(c.state.panes.map((p) => p.kind)).toEqual(['EpgSources', 'Recording', 'AppearanceLogos']);
    c.activate(RowIds.PARENTAL_CHANGE_PIN);
    expect(c.state.overlay).toEqual({ kind: 'PinSetup', armsParental: false });
    c.activate(RowIds.EPG_ADD_SOURCE);
    expect(c.state.overlay).toMatchObject({ kind: 'TextEdit', title: 'EPG URL', value: '' });
    deps.settings.set(TellySettings.CORS_PROXY, 'http://proxy/?u=');
    c.activate(RowIds.CORS_PROXY);
    expect(c.state.overlay).toMatchObject({
      kind: 'TextEdit',
      title: 'Stream & CORS proxy',
      value: 'http://proxy/?u=',
    });
    c.activate(RowIds.SEARCH_CLEAR_HISTORY);
    expect(c.state.overlay).toEqual({ kind: 'ConfirmClearHistory' });
  });

  it('runs the named actions through the callbacks and refreshes', async () => {
    c.activate(RowIds.RESTORE_DATA);
    expect(deps.callbacks.onImportBackup).toHaveBeenCalled();
    c.activate(RowIds.ABOUT_PRIVACY_POLICY);
    expect(deps.callbacks.onOpenPrivacyPolicy).toHaveBeenCalled();
    c.activate(RowIds.ADD_PLAYLIST);
    expect(deps.callbacks.onAddPlaylist).toHaveBeenCalled();
    c.activate(RowIds.BACK_UP_DATA);
    await vi.waitFor(() =>
      expect(deps.callbacks.onExportBackup).toHaveBeenCalledWith(expect.stringContaining('"version": 1')),
    );
    c.activate(RowIds.EPG_UPDATE_NOW);
    expect(c.refresh.status.value).toEqual({ kind: 'busy', rowId: RowIds.EPG_UPDATE_NOW });
    await flush();
    expect(c.refresh.status.value).toEqual({ kind: 'message', text: 'EPG updated' });
  });

  it('gates the blocked-channels pane behind the PIN only while a PIN exists', async () => {
    c.activate(RowIds.PARENTAL_BLOCKED_CHANNELS);
    expect(c.state.panes).toEqual([{ kind: 'BlockedChannels' }]);
    await deps.parental.setPin('1111');
    c.activate(RowIds.PARENTAL_BLOCKED_CHANNELS);
    expect(c.state.overlay).toEqual({ kind: 'PinVerify', target: 'BLOCKED_CHANNELS' });
  });

  it('ignores EPG source edits when no source pane is active and unknown rows', () => {
    c.activate(RowIds.EPG_SOURCE_URL);
    c.activate(RowIds.EPG_SOURCE_DELETE);
    c.activate('nonsense.row');
    expect(c.state.overlay).toBeNull();
  });
});
