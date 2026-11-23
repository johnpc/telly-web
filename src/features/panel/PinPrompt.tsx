import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { pinView } from '@/core/ui/pinEntry';
import { usePinEntry, type PinEntryHandlers } from '@/core/ui/usePinEntry';
import { ChannelPanelScreenPin } from './ChannelPanelScreenPin';

interface PinPromptProps {
  /** "PIN input method" = Keyboard: masked digits field instead of the wheels. */
  keyboard: boolean;
  onSubmit: PinEntryHandlers['onSubmit'];
  onDismiss(): void;
}

/** The modal PIN prompt over the panel: the shared `PIN entry` machine (wheels or keyboard); BACK dismisses. */
export function PinPrompt({ keyboard, onSubmit, onDismiss }: PinPromptProps): JSX.Element {
  const { state, onTyped } = usePinEntry({ onSubmit, onDismiss, keyboard });
  const view = pinView(state);
  return (
    <FocusScope id="channel-panel-pin" trap autoFocus="first" onBack={onDismiss}>
      <ChannelPanelScreenPin
        title="Enter PIN"
        keyboard={keyboard}
        entry={view.wheel}
        typed={view.typed}
        onTyped={onTyped}
      />
    </FocusScope>
  );
}
