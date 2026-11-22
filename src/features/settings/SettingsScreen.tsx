import { type JSX, useCallback } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useConfigAutoBackup } from './backup/autoBackupEngine';
import { paneTitle } from './paneTitle';
import type { RefreshStatus } from './refreshStatus';
import { SettingsOverlayScreen } from './SettingsOverlayScreen';
import { SettingsSheetScreen } from './SettingsSheetScreen';
import { activePane, paneKey } from './settingsUiState';
import { useApplyAppearance } from './useApplyAppearance';
import {
  useRefreshStatus,
  useSettingsController,
  useSettingsRows,
  useSettingsState,
} from './useSettingsController';
import { useSettingsFeeds } from './useSettingsFeeds';
import './settings.css';

/**
 * The settings surface (device-verified 2026-09-13): ONE 360 dp right sheet
 * over the dimmed underlying screen. The root sheet lists the sections; OK
 * replaces it in place with the section's sheet; BACK pops one sheet, and
 * from the root leaves settings (`navigator.pop()`). The web shell keeps
 * only the top route mounted, so the dimmed underlay is the app background
 * under the 60 % scrim rather than the live guide. Every overlay owns the
 * screen: the sheet is dropped while one is up and its focus memory
 * restores the row when the overlay closes.
 */
export function SettingsScreen(): JSX.Element {
  const navigator = useNavigator();
  const controller = useSettingsController();
  const state = useSettingsState(controller);
  const feeds = useSettingsFeeds();
  const rows = useSettingsRows(controller, feeds);
  const refresh = useRefreshStatus(controller);
  useConfigAutoBackup();
  useApplyAppearance();
  const onBack = useCallback((): void => {
    if (!controller.back()) navigator.pop();
  }, [controller, navigator]);
  const pane = activePane(state);
  return (
    <FocusScope id="settings" trap autoFocus={false} onBack={onBack}>
      <div className="relative h-full w-full bg-telly-background" data-testid="settings-root">
        {state.overlay === null ? (
          <SettingsSheetScreen
            title={paneTitle(pane, feeds)}
            rows={rows}
            paneKey={paneKey(pane)}
            focusMemory={controller.focusMemory}
            onActivate={(rowId) => controller.activate(rowId)}
          />
        ) : (
          <SettingsOverlayScreen controller={controller} overlay={state.overlay} />
        )}
        <RefreshToast status={refresh} />
      </div>
    </FocusScope>
  );
}

/** The refresh completion message, bottom-center in the guide hint-toast treatment. */
function RefreshToast({ status }: { status: RefreshStatus }): JSX.Element | null {
  if (status.kind !== 'message') return null;
  return (
    <output
      className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded bg-telly-guide-toast px-6 py-4 text-[1.875rem] text-black"
      data-testid="settings-toast"
    >
      {status.text}
    </output>
  );
}
