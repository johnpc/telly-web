import { useCallback, useState, type JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { PinKeyboard } from '@/features/playback/gate/pinEntry';
import { usePinEntry } from '@/features/playback/gate/usePinEntry';
import { ChannelPanelScreenPin } from './ChannelPanelScreenPin';

interface PinPromptProps {
  /** "PIN input method" = Keyboard: masked digits field instead of the wheels. */
  keyboard: boolean;
  onSubmit(pin: string): void;
  onDismiss(): void;
}

/** Keyboard-mode field: sanitises input and commits as soon as the fourth digit lands. */
function usePinKeyboard(onSubmit: (pin: string) => void): [string, (raw: string) => void] {
  const [typed, setTyped] = useState('');
  const onTyped = useCallback(
    (raw: string) => {
      const value = PinKeyboard.sanitize(raw);
      if (!PinKeyboard.isComplete(value)) return setTyped(value);
      setTyped('');
      onSubmit(value);
    },
    [onSubmit],
  );
  return [typed, onTyped];
}

/** The modal PIN prompt over the panel: wheels (shared with the blocked-channel gate) or keyboard entry; BACK dismisses. */
export function PinPrompt({ keyboard, onSubmit, onDismiss }: PinPromptProps): JSX.Element {
  const entry = usePinEntry({ onSubmit, onDismiss }, !keyboard);
  const [typed, onTyped] = usePinKeyboard(onSubmit);
  return (
    <FocusScope id="channel-panel-pin" trap autoFocus="first" onBack={onDismiss}>
      <ChannelPanelScreenPin
        title="Enter PIN"
        keyboard={keyboard}
        entry={entry}
        typed={typed}
        onTyped={onTyped}
      />
    </FocusScope>
  );
}
