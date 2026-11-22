import { useCallback } from 'react';
import { focusEngine } from '@/core/focus/focusEngine';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import type { ChannelRow } from '@/core/db/types';
import type { PlaybackSession } from '@/features/playback/tune';
import { rowIdOf, wrapTargetFor } from './panelKeys';
import type { PanelFocusActions } from './usePanelFocus';
import type { PanelRow } from './panelRows';

/**
 * The panel's own keys while a row is focused: long-OK opens the channel
 * menu, UP/DOWN wrap at the list ends. Everything else (arrows between
 * columns, OK = click, BACK) is the focus engine's and the scope's.
 */
export function usePanelKeys(
  rows: readonly PanelRow[],
  focusedRow: number,
  browsing: boolean,
  onContextMenu: (channel: ChannelRow) => void,
): void {
  const handleKey = useCallback(
    (key: RemoteKey): boolean => {
      const row = rows[focusedRow];
      if (row === undefined || !browsing) return false;
      if (key === 'LONG_OK') return (onContextMenu(row.channel), true);
      const target = wrapTargetFor(key, rows, focusedRow);
      return target !== null && focusEngine.focus(rowIdOf(target.channel.id));
    },
    [rows, focusedRow, browsing, onContextMenu],
  );
  useKeyHandler(handleKey);
}

/** OK on a group row: switch to it, or prompt for the PIN when parental controls lock it. */
export function useSelectGroup(
  focus: PanelFocusActions,
  lockedGroups: ReadonlySet<string>,
): (group: string) => void {
  return useCallback(
    (group: string) => focus.selectGroup(group, lockedGroups.has(group)),
    [focus, lockedGroups],
  );
}

/** OK on a row: tune it, then let the host dismiss the panel and show the zap overlay. */
export function useTune(
  session: PlaybackSession,
  onTuned: (channel: ChannelRow) => void,
): (row: PanelRow) => void {
  return useCallback(
    (row: PanelRow) => {
      session.tuner.tune(row.channel);
      onTuned(row.channel);
    },
    [session, onTuned],
  );
}
