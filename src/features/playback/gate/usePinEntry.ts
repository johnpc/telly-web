import { useCallback, useState } from 'react';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { EMPTY_PIN, pinStep, pinValue, type PinEntry } from './pinEntry';

export interface PinEntryHandlers {
  onSubmit: (pin: string) => void;
  /** BACK cancels when given; otherwise BACK falls through to the host (a pushed dialog's pop). */
  onDismiss?: (() => void) | undefined;
}

/**
 * The picker-style PIN wheels' key handling: UP/DOWN spin, LEFT/RIGHT move,
 * digits type, OK commits and blanks the wheels (a rejected PIN starts over
 * from 0000 with the first wheel active).
 */
export function usePinEntry({ onSubmit, onDismiss }: PinEntryHandlers, enabled = true): PinEntry {
  const [entry, setEntry] = useState<PinEntry>(EMPTY_PIN);
  const handler = useCallback(
    (key: RemoteKey): boolean => {
      if (key === 'OK') {
        onSubmit(pinValue(entry));
        setEntry(EMPTY_PIN);
        return true;
      }
      if (key === 'BACK') {
        if (onDismiss === undefined) return false;
        onDismiss();
        return true;
      }
      const next = pinStep(entry, key);
      if (next === null) return key !== 'LONG_OK';
      setEntry(next);
      return true;
    },
    [entry, onSubmit, onDismiss],
  );
  useKeyHandler(handler, enabled);
  return entry;
}
