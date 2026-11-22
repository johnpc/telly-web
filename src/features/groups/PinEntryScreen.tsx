import { useState, type JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useFocusable } from '@/core/focus/useFocusable';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { sp } from '@/features/guide/guideCss';

interface PinEntryProps {
  focusId: string;
  onSubmit: (pin: string) => void;
}

export const PIN_LENGTH = 4;

/** Masked 4-digit PIN entry (Android `SettingsScreenPinEntry`, keyboard method): 4 digits or OK commit. */
export function PinEntryScreen({ focusId, onSubmit }: PinEntryProps): JSX.Element {
  const [pin, setPin] = useState('');
  const { ref, props } = useFocusable(focusId);
  useKeyHandler((key) => {
    if (key !== 'OK' || pin === '') return false;
    onSubmit(pin);
    return true;
  });
  const onChange = (next: string): void => {
    const digits = next.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    if (digits.length === PIN_LENGTH) onSubmit(digits);
  };
  return (
    <FocusScope id={`${focusId}-scope`} autoFocus="first">
      <div className="flex flex-col items-center gap-[1em]" style={{ fontSize: sp(16) }}>
        <p className="text-telly-text-muted">Enter the 4-digit PIN</p>
        <input
          {...props}
          ref={ref}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => onChange(e.target.value)}
          className="w-[8em] border-b-2 border-telly-field-underline bg-transparent text-center tracking-[0.5em] text-telly-text outline-none focus:border-telly-accent-blue"
          style={{ fontSize: sp(24) }}
          data-testid="pin-keyboard"
        />
      </div>
    </FocusScope>
  );
}
