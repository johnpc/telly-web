import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { pinView, type PinWheel } from '@/core/ui/pinEntry';
import { usePinEntry, type PinEntryHandlers } from '@/core/ui/usePinEntry';

interface PinPromptProps {
  title: string;
  /** "PIN input method" = Keyboard swaps the wheels for the masked digit field. */
  keyboard: boolean;
  onSubmit: PinEntryHandlers['onSubmit'];
  /** BACK cancels when given; a pushed dialog leaves BACK to its host. */
  onDismiss?: (() => void) | undefined;
}

function Wheels({ entry }: { entry: PinWheel }): JSX.Element {
  return (
    <div className="flex gap-[1.5rem]" data-testid="pin-wheel">
      {entry.digits.map((digit, index) => {
        const active = index === entry.cursor;
        return (
          <div
            key={index}
            data-active={active ? 'true' : undefined}
            className={`flex h-[7rem] w-[5.5rem] items-center justify-center rounded text-[3rem] ${
              active
                ? 'bg-telly-playback-accent/25 text-telly-playback-accent'
                : 'bg-telly-button-resting text-telly-text'
            }`}
          >
            {digit}
          </div>
        );
      })}
    </div>
  );
}

function KeyboardField({ typed, onTyped }: { typed: string; onTyped: (raw: string) => void }): JSX.Element {
  return (
    <input
      type="password"
      inputMode="numeric"
      autoFocus
      data-testid="pin-keyboard"
      value={typed}
      onChange={(event) => onTyped(event.target.value)}
      className="w-[19rem] border-b-[0.25rem] border-telly-field-underline bg-transparent py-[1rem] text-center text-[3rem] tracking-[1rem] text-telly-text outline-none"
    />
  );
}

/** Centered PIN card over playback: the shared `PIN entry` machine (wheels or masked keyboard per the persisted "PIN input method"). */
export function PinPrompt({ title, keyboard, onSubmit, onDismiss }: PinPromptProps): JSX.Element {
  const { state, onTyped } = usePinEntry({ onSubmit, onDismiss, keyboard });
  const view = pinView(state);
  return (
    <FocusScope
      id="pin-prompt"
      trap
      autoFocus={false}
      {...(onDismiss === undefined ? {} : { onBack: onDismiss })}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-black/70" data-testid="pin-prompt">
        <div className="flex flex-col items-center gap-[2rem] rounded bg-telly-guidance-pane p-[3rem]">
          <h2 className="text-[2.125rem] font-semibold text-white">{title}</h2>
          {keyboard ? <KeyboardField typed={view.typed} onTyped={onTyped} /> : <Wheels entry={view.wheel} />}
        </div>
      </div>
    </FocusScope>
  );
}
