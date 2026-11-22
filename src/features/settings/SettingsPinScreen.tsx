import { type JSX, useCallback, useState } from 'react';
import { isDirection, type RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { EMPTY_PIN_ENTRY, type PinEntry, pinCommit, pinDown, pinLeft, pinRight, pinUp } from './pinEntry';
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

const SPIN: Readonly<Record<string, (entry: PinEntry) => PinEntry>> = {
  UP: pinUp,
  DOWN: pinDown,
  LEFT: pinLeft,
  RIGHT: pinRight,
};

/**
 * PIN setup/change ("Change PIN") and verify ("Enter PIN") dialogs: the entry
 * style follows the persisted "PIN input method" — four digit wheels
 * (UP/DOWN spins, LEFT/RIGHT moves, OK commits) or the masked 4-digit
 * keyboard entry that commits on the fourth digit. Same verify semantics.
 */
export function SettingsPinScreen({ controller, overlay }: PinProps): JSX.Element {
  const keyboard = useKeyboardPin(controller);
  const commit = overlay.kind === 'PinSetup' ? submitPin : submitVerifyPin;
  const onSubmit = useCallback((pin: string): void => void commit(controller, pin), [commit, controller]);
  return (
    <SettingsSheetFrameScreen title={overlay.kind === 'PinSetup' ? 'Change PIN' : 'Enter PIN'}>
      <div className="px-12 pt-6">
        {keyboard ? <PinKeyboardScreen onSubmit={onSubmit} /> : <PinWheel onSubmit={onSubmit} />}
      </div>
    </SettingsSheetFrameScreen>
  );
}

function PinWheel({ onSubmit }: { onSubmit: (pin: string) => void }): JSX.Element {
  const [entry, setEntry] = useState<PinEntry>(EMPTY_PIN_ENTRY);
  useKeyHandler((key: RemoteKey): boolean => {
    if (key === 'OK') {
      setEntry((current) => pinCommit(current, onSubmit));
      return true;
    }
    if (!isDirection(key)) return false;
    setEntry((current) => SPIN[key]?.(current) ?? current);
    return true;
  });
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
