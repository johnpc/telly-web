import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { useFocusable } from '@/core/focus/useFocusable';
import type { PinEntry } from '@/features/playback/gate/pinEntry';

interface PinScreenProps {
  title: string;
  keyboard: boolean;
  entry: PinEntry;
  typed: string;
  onTyped(raw: string): void;
}

function KeyboardField({ typed, onTyped }: Pick<PinScreenProps, 'typed' | 'onTyped'>): JSX.Element {
  const { ref, props } = useFocusable('pin-input');
  return (
    <input
      {...props}
      ref={ref}
      data-testid="pin-input"
      type="password"
      inputMode="numeric"
      autoComplete="off"
      aria-label="PIN"
      value={typed}
      onChange={(e) => onTyped(e.target.value)}
      className="w-48 border-b-2 border-telly-field-underline bg-transparent text-center text-[2.5rem] tracking-[1rem] text-white outline-none"
    />
  );
}

/**
 * The parental prompt over the panel when a locked group is selected:
 * centered card with four digit wheels (UP/DOWN spin, LEFT/RIGHT move, OK
 * submits) or the masked keyboard entry per "PIN input method".
 */
export function ChannelPanelScreenPin({
  title,
  keyboard,
  entry,
  typed,
  onTyped,
}: PinScreenProps): JSX.Element {
  return (
    <div
      data-testid="panel-pin-prompt"
      className="absolute inset-0 flex items-center justify-center bg-black/70"
    >
      <div className="flex flex-col items-center gap-8 rounded bg-telly-guidance-pane p-12">
        <span className="text-[2.125rem] font-semibold text-white">{title}</span>
        {keyboard ? (
          <KeyboardField typed={typed} onTyped={onTyped} />
        ) : (
          <Focusable focusId="pin-wheels" data-testid="pin-wheels" className="flex gap-6">
            {entry.digits.map((digit, index) => (
              <span
                key={index}
                data-testid="pin-wheel"
                data-active={index === entry.cursor ? 'true' : undefined}
                className={`flex h-24 w-16 items-center justify-center rounded text-[2.5rem] ${
                  index === entry.cursor
                    ? 'bg-telly-focus-fill text-telly-focus-text'
                    : 'bg-telly-button-resting text-white'
                }`}
              >
                {digit}
              </span>
            ))}
          </Focusable>
        )}
      </div>
    </div>
  );
}
