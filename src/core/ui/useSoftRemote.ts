import { useCallback, useEffect, useMemo, useState } from 'react';
import { HoldKeyDetector } from '../input/holdKeyDetector';
import { useKeyRouter } from '../input/keyRouterContext';
import type { RemoteKey, SimpleRemoteKey } from '../input/remoteKeys';
import { SOFT_REMOTE_INSET_PX, softRemoteInset } from './softRemoteInset';
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
  useSoftRemoteInset(visible && open);
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

/** Reserves the open pad's height at the bottom of the shell so it never covers the focused row. */
function useSoftRemoteInset(open: boolean): void {
  useEffect(() => {
    const px = open ? SOFT_REMOTE_INSET_PX : 0;
    softRemoteInset.set(px);
    document.documentElement.style.setProperty('--soft-remote-inset', `${px}px`);
    return () => {
      softRemoteInset.set(0);
      document.documentElement.style.removeProperty('--soft-remote-inset');
    };
  }, [open]);
}
