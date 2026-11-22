import { useState, type JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useFocusable } from '@/core/focus/useFocusable';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { sp } from '@/features/guide/guideCss';

interface TextFieldProps {
  focusId: string;
  initial: string;
  /** OK (Enter) commits the current text, like the Android IME "Done". */
  onCommit: (text: string) => void;
}

/** The underlined settings-style editor (Android `SettingsScreenTextField`). */
export function TextFieldScreen({ focusId, initial, onCommit }: TextFieldProps): JSX.Element {
  const [value, setValue] = useState(initial);
  const { ref, props } = useFocusable(focusId);
  useKeyHandler((key) => {
    if (key !== 'OK') return false;
    onCommit(value);
    return true;
  });
  return (
    <FocusScope id={`${focusId}-scope`} autoFocus="first">
      <input
        {...props}
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border-b-2 border-telly-field-underline bg-transparent py-[0.4em] text-telly-text outline-none focus:border-telly-accent-blue"
        style={{ fontSize: sp(18) }}
        data-testid="text-field"
      />
    </FocusScope>
  );
}
