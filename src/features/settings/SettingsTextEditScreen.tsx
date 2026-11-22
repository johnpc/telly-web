import { type JSX, type RefObject, useEffect, useRef } from 'react';
import { isDirection, type RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import type { SettingsController } from './settingsController';
import { submitText } from './settingsOverlayResults';
import type { SettingsOverlay } from './settingsUiState';
import { SettingsSheetFrameScreen } from './SettingsSheetScreen';
import { moveCaret } from './textCaret';

type TextEdit = Extract<SettingsOverlay, { kind: 'TextEdit' }>;

/**
 * DOM-focuses the field on mount with the whole value selected: typing
 * REPLACES the stored value (the Android editor's text-replacement idiom —
 * a remote has no "select all"), while LEFT/RIGHT collapse to a caret.
 */
function useFocusSelected(input: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const field = input.current;
    if (field === null) return;
    field.focus();
    field.select();
  }, [input]);
}

/** OK commits the field's text; arrows move the caret; everything else falls through. */
function editorKey(field: HTMLInputElement | null, key: RemoteKey, commit: (text: string) => void): boolean {
  if (field === null) return false;
  if (key === 'OK') {
    commit(field.value);
    return true;
  }
  return isDirection(key) && moveCaret(field, key);
}

/**
 * Free-form value editor (User-Agent, proxies, playlist rename/URL, EPG URL):
 * an underlined single-line field; OK (Enter) commits, BACK cancels. Arrows
 * move the caret here because the key bridge claims them as remote keys.
 */
export function SettingsTextEditScreen({
  controller,
  overlay,
}: {
  controller: SettingsController;
  overlay: TextEdit;
}): JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  useFocusSelected(input);
  useKeyHandler((key: RemoteKey): boolean =>
    editorKey(input.current, key, (text) => void submitText(controller, text)),
  );
  return (
    <SettingsSheetFrameScreen title={overlay.title}>
      <div className="px-12 pt-6">
        <input
          ref={input}
          type="text"
          defaultValue={overlay.value}
          spellCheck={false}
          autoComplete="off"
          data-testid="settings-text-edit"
          aria-label={overlay.title}
          className="w-full border-0 border-b border-telly-field-underline bg-transparent py-4 text-[1.75rem] text-telly-text caret-telly-playback-accent outline-none font-condensed"
        />
      </div>
    </SettingsSheetFrameScreen>
  );
}
