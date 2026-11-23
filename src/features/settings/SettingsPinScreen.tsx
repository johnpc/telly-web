import { type JSX, useCallback } from 'react';
import { pinView } from '@/core/ui/pinEntry';
import { usePinEntry, type PinEntryHandlers } from '@/core/ui/usePinEntry';
import { PinKeyboardScreen } from './SettingsPinKeyboardScreen';
import type { SettingsController } from './settingsController';
import { submitPin, submitVerifyPin } from './settingsOverlayResults';
import type { SettingsOverlay } from './settingsUiState';
import { SettingsSheetFrameScreen } from './SettingsSheetScreen';
import { useKeyboardPin } from './useSettingsController';

type PinOverlay = Extract<SettingsOverlay, { kind: 'PinSetup' | 'PinVerify' }>;

interface PinProps {
  controller: SettingsController;
  overlay: PinOverlay;
}

/**
 * PIN setup/change ("Change PIN") and verify ("Enter PIN") dialogs: the entry
 * style follows the persisted "PIN input method" — four digit wheels
 * (UP/DOWN spins, LEFT/RIGHT moves, OK commits) or the masked 4-digit
 * keyboard entry that commits on the fourth digit — one shared `PIN entry` machine.
 */
export function SettingsPinScreen({ controller, overlay }: PinProps): JSX.Element {
  const keyboard = useKeyboardPin(controller);
  const commit = overlay.kind === 'PinSetup' ? submitPin : submitVerifyPin;
  const onSubmit = useCallback(
    (pin: string): Promise<unknown> => commit(controller, pin),
    [commit, controller],
  );
  return (
    <SettingsSheetFrameScreen title={overlay.kind === 'PinSetup' ? 'Change PIN' : 'Enter PIN'}>
      <div className="px-12 pt-6">
        {keyboard ? <PinKeyboardScreen onSubmit={onSubmit} /> : <PinWheel onSubmit={onSubmit} />}
      </div>
    </SettingsSheetFrameScreen>
  );
}

function PinWheel({ onSubmit }: { onSubmit: PinEntryHandlers['onSubmit'] }): JSX.Element {
  const { state } = usePinEntry({ onSubmit, keyboard: false });
  const entry = pinView(state).wheel;
  return (
    <div className="flex gap-6" data-testid="pin-wheel" role="group" aria-label="PIN">
      {entry.digits.map((digit, index) => {
        const active = index === entry.cursor;
        return (
          <span
            key={index}
            data-active={active ? 'true' : undefined}
            className={`flex h-28 w-22 items-center justify-center rounded-lg text-[3rem] font-condensed ${
              active
                ? 'bg-telly-playback-accent/25 text-telly-playback-accent'
                : 'bg-telly-button-resting text-telly-text'
            }`}
          >
            {digit}
          </span>
        );
      })}
    </div>
  );
}
