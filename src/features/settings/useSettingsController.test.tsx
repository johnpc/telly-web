import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import * as backupFiles from './backup/backupFiles';
import { RowIds } from './rowIds';
import { EMPTY_FEEDS } from './settingsFeeds';
import {
  useKeyboardPin,
  useRefreshStatus,
  useSettingsController,
  useSettingsRows,
  useSettingsState,
} from './useSettingsController';

describe('useSettingsController', () => {
  afterEach(() => vi.restoreAllMocks());

  it('creates one controller wired to the navigator, download and file picker', async () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const navigator = new Navigator({ kind: 'Guide' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsContext value={settings}>
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      </SettingsContext>
    );
    const download = vi.spyOn(backupFiles, 'downloadBackup').mockImplementation(() => undefined);
    const pick = vi
      .spyOn(backupFiles, 'pickBackupFile')
      .mockResolvedValue('{"version":1,"settings":{"general_confirm_exit":"true"},"playlists":[]}');
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { result, rerender } = renderHook(
      () => {
        const controller = useSettingsController();
        return {
          controller,
          state: useSettingsState(controller),
          rows: useSettingsRows(controller, EMPTY_FEEDS),
          refresh: useRefreshStatus(controller),
          keyboard: useKeyboardPin(controller),
        };
      },
      { wrapper },
    );
    const first = result.current.controller;
    rerender();
    expect(result.current.controller).toBe(first);
    expect(result.current.rows.map((row) => row.id)).toContain(`${RowIds.SECTION_PREFIX}GENERAL`);
    expect(result.current.refresh).toEqual({ kind: 'idle' });
    expect(result.current.keyboard).toBe(false);
    first.deps.callbacks.onAddPlaylist();
    expect(navigator.current).toEqual({ kind: 'AddPlaylistWizard' });
    first.deps.callbacks.onExportBackup('{}');
    expect(download).toHaveBeenCalledWith('{}');
    first.deps.callbacks.onOpenPrivacyPolicy();
    expect(open).toHaveBeenCalled();
    first.deps.callbacks.onImportBackup();
    expect(pick).toHaveBeenCalled();
    await waitFor(() => expect(settings.get(TellySettings.CONFIRM_EXIT)).toBe(true));
    act(() => first.activate(`${RowIds.SECTION_PREFIX}PARENTAL_CONTROLS`));
    expect(result.current.state.panes).toEqual([{ kind: 'Section', section: 'PARENTAL_CONTROLS' }]);
    expect(result.current.rows[0]).toMatchObject({ title: 'Off' });
    act(() => settings.set(TellySettings.PARENTAL_PIN_INPUT_METHOD, 'Keyboard'));
    expect(result.current.keyboard).toBe(true);
    expect(result.current.rows.find((row) => row.id === RowIds.PARENTAL_PIN_INPUT)).toMatchObject({
      summary: 'Keyboard',
    });
    pick.mockResolvedValueOnce(null);
    first.deps.callbacks.onImportBackup();
  });
});
