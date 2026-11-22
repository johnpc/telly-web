import { useEffect } from 'react';
import { focusEngine } from '@/core/focus/focusEngine';
import { useFocusedId } from '@/core/focus/useFocusedId';

/** Focus ids of settings rows are namespaced so they never collide with the screens beneath. */
export const FOCUS_PREFIX = 'settings/';

export function rowFocusId(rowId: string): string {
  return FOCUS_PREFIX + rowId;
}

/**
 * Per-pane focus memory (Android `focusMemory`): a fresh sheet focuses its
 * first focusable row; popping back restores the row you came from. The
 * engine's own scope memory cannot do this because every pane's rows live
 * in the one trapped settings scope.
 */
export function useSheetFocus(
  memory: Map<string, string>,
  paneKey: string,
  firstRowId: string | null,
  presentFocusIds: readonly string[],
): void {
  useRememberFocus(memory, paneKey, presentFocusIds);
  useEffect(() => landFocus(memory.get(paneKey), firstRowId), [memory, paneKey, firstRowId]);
}

/** Only a row of THIS pane is worth remembering: the previous pane's row is still "focused" for one render. */
function useRememberFocus(
  memory: Map<string, string>,
  paneKey: string,
  presentFocusIds: readonly string[],
): void {
  const focused = useFocusedId();
  useEffect(() => {
    if (focused !== null && presentFocusIds.includes(focused)) memory.set(paneKey, focused);
  }, [memory, focused, paneKey, presentFocusIds]);
}

/** The remembered row when it still exists, else the first row. */
export function landFocus(remembered: string | undefined, firstRowId: string | null): void {
  if (remembered !== undefined && focusEngine.focus(remembered)) return;
  if (firstRowId !== null) focusEngine.focus(rowFocusId(firstRowId));
}

/** Overlays focus one chosen element on mount (the current picker option, the first action). */
export function useOverlayFocus(focusId: string | null): void {
  useEffect(() => {
    if (focusId !== null) focusEngine.focus(focusId);
  }, [focusId]);
}
