import { useEffect, useRef } from 'react';
import { type FocusEngine, focusEngine } from '@/core/focus/focusEngine';
import type { FocusCommand } from './panelFocus';
import { rowIdOf } from './panelKeys';
import type { PanelRow } from './panelRows';

/**
 * Executes the panel's focus command on the row list (Android
 * `ChannelPanelScreenList`'s `LaunchedEffect(command.version)`): every
 * version is honoured once the target row is mounted, even when the D-pad
 * has since moved elsewhere. A row that is not yet registered (rows still
 * loading) retries on the next rows change.
 */
export function useFocusCommand(
  command: FocusCommand,
  rows: readonly PanelRow[],
  engine: FocusEngine = focusEngine,
): void {
  const done = useRef(-1);
  useEffect(() => {
    if (done.current === command.version) return;
    const row = rows[command.index] ?? rows[0];
    if (row !== undefined && engine.focus(rowIdOf(row.channel.id))) done.current = command.version;
  }, [command, rows, engine]);
}
