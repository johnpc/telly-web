import { useCallback, useMemo, useState } from 'react';
import { HoldKeyDetector } from '../input/holdKeyDetector';
import { useKeyRouter } from '../input/keyRouterContext';
import type { RemoteKey, SimpleRemoteKey } from '../input/remoteKeys';
import { useIsTouchDevice } from './useIsTouchDevice';

/** Pointer handlers for the OK button: press-and-hold ≥ 500 ms fires LONG_OK, a shorter press fires OK. */
export interface OkPressHandlers {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
}

export interface SoftRemoteState {
  /** False on non-touch devices: render nothing. */
  visible: boolean;
  open: boolean;
  toggle: () => void;
  /** Dispatch a plain key (every button except OK). */
  press: (key: SimpleRemoteKey) => void;
  okHandlers: OkPressHandlers;
}

/** All behaviour behind `SoftRemote`; the component only renders. */
export function useSoftRemote(): SoftRemoteState {
  const router = useKeyRouter();
  const visible = useIsTouchDevice();
  const [open, setOpen] = useState(true);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const press = useCallback((key: SimpleRemoteKey) => void router.dispatch(key), [router]);
  const okHandlers = useMemo<OkPressHandlers>(() => {
    const hold = new HoldKeyDetector<RemoteKey>('OK', 'LONG_OK', (key) => void router.dispatch(key));
    return {
      onPointerDown: () => hold.onDown(false),
      onPointerUp: () => hold.onUp(),
      onPointerCancel: () => hold.cancel(),
      onPointerLeave: () => hold.cancel(),
    };
  }, [router]);
  return { visible, open, toggle, press, okHandlers };
}
