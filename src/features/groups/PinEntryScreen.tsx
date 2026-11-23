import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useFocusable } from '@/core/focus/useFocusable';
import { pinView } from '@/core/ui/pinEntry';
import { usePinEntry, type PinEntryHandlers } from '@/core/ui/usePinEntry';
import { sp } from '@/features/guide/guideCss';

interface PinEntryProps {
  focusId: string;
  onSubmit: PinEntryHandlers['onSubmit'];
}

/** Masked 4-digit PIN entry in a sheet (Android `SettingsScreenPinEntry`, keyboard method): the shared `PIN entry` machine. */
export function PinEntryScreen({ focusId, onSubmit }: PinEntryProps): JSX.Element {
  const { state, onTyped } = usePinEntry({ onSubmit, keyboard: true });
  const { ref, props } = useFocusable(focusId);
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
          value={pinView(state).typed}
          onChange={(e) => onTyped(e.target.value)}
          className="w-[8em] border-b-2 border-telly-field-underline bg-transparent text-center tracking-[0.5em] text-telly-text outline-none focus:border-telly-accent-blue"
          style={{ fontSize: sp(24) }}
          data-testid="pin-keyboard"
        />
      </div>
    </FocusScope>
  );
}
