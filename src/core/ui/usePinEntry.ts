import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import type { PinEntryState } from './pinEntry';
import { PinEntryStore } from './pinEntryStore';

export interface PinEntryHandlers {
  /** Return the host's promise: the entry stays `Submitted` (deaf to keys) until it settles. */
  onSubmit: (pin: string) => unknown;
  /** BACK cancels when given; otherwise BACK falls through to the host (a pushed dialog's pop). */
  onDismiss?: (() => void) | undefined;
  /** "PIN input method" = Keyboard: the masked field types, OK commits what was typed. */
  keyboard: boolean;
}

export interface PinEntryControls {
  state: PinEntryState;
  /** The masked field's `onChange`. */
  onTyped(raw: string): void;
}

function dismiss(onDismiss: (() => void) | undefined): boolean {
  if (onDismiss === undefined) return false;
  onDismiss();
  return true;
}

/**
 * Drives the one `PinEntryState` for a mounted prompt: UP/DOWN spin, LEFT/RIGHT
 * move, digits type, OK commits; while `Submitted` every key but BACK is
 * swallowed and the field ignores edits.
 */
export function usePinEntry({ onSubmit, onDismiss, keyboard }: PinEntryHandlers): PinEntryControls {
  const [store] = useState(() => new PinEntryStore());
  useEffect(() => {
    store.setHost(onSubmit);
  }, [store, onSubmit]);
  const state = useSyncExternalStore(store.subscribe, () => store.current);
  const handler = useCallback(
    (key: RemoteKey): boolean => {
      if (key === 'BACK') return dismiss(onDismiss);
      return store.key(key, keyboard) ?? key !== 'LONG_OK';
    },
    [keyboard, onDismiss, store],
  );
  useKeyHandler(handler);
  return { state, onTyped: store.typed };
}
