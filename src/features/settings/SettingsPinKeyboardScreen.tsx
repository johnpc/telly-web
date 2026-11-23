import { type JSX, useEffect, useRef } from 'react';
import { pinView } from '@/core/ui/pinEntry';
import { usePinEntry, type PinEntryHandlers } from '@/core/ui/usePinEntry';

/**
 * The "Keyboard" PIN input method: a masked digits-only field driven by the
 * shared `PIN entry` machine (fourth digit or OK commits, once). Arrows are
 * swallowed so focus never leaves it.
 */
export function PinKeyboardScreen({ onSubmit }: { onSubmit: PinEntryHandlers['onSubmit'] }): JSX.Element {
  const { state, onTyped } = usePinEntry({ onSubmit, keyboard: true });
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <input
      ref={input}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      value={pinView(state).typed}
      data-testid="pin-keyboard"
      aria-label="PIN"
      onChange={(event) => onTyped(event.target.value)}
      className="w-[19rem] border-0 border-b border-telly-field-underline bg-transparent py-4 text-[3rem] tracking-[0.5rem] text-telly-text caret-telly-playback-accent outline-none font-condensed"
    />
  );
}
