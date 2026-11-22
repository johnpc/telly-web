import { type JSX, useEffect, useRef, useState } from 'react';
import { isDirection, type RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { isPinComplete, keyboardPinCommit, sanitizePin } from './pinEntry';

/**
 * The "Keyboard" PIN input method: a masked digits-only field that commits
 * on the fourth digit (or OK). Arrows are swallowed so focus never leaves it.
 */
export function PinKeyboardScreen({ onSubmit }: { onSubmit: (pin: string) => void }): JSX.Element {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  useKeyHandler((key: RemoteKey): boolean => {
    if (key !== 'OK') return isDirection(key);
    setValue((current) => keyboardPinCommit(current, onSubmit));
    return true;
  });
  return (
    <input
      ref={input}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      data-testid="pin-keyboard"
      aria-label="PIN"
      onChange={(event) => {
        const digits = sanitizePin(event.target.value);
        setValue(isPinComplete(digits) ? keyboardPinCommit(digits, onSubmit) : digits);
      }}
      className="w-[19rem] border-0 border-b border-telly-field-underline bg-transparent py-4 text-[3rem] tracking-[0.5rem] text-telly-text caret-telly-playback-accent outline-none font-condensed"
    />
  );
}
