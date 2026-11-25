import { useSyncExternalStore } from 'react';
import { isDirection, type RemoteKey } from '@/core/input/remoteKeys';
import type { RouteKind } from '@/core/navigation/routes';
import { useRoute } from '@/core/navigation/useRoute';
import { type PwaUpdate, type PwaUpdateState, pwaUpdate } from './pwaUpdate';

/** Toast copy: a bold title line, then the two keys the way the guide hint lists its keys. */
export const UPDATE_TOAST_TITLE = 'telly was updated';
export const UPDATE_TOAST_KEYS: readonly (readonly [string, string])[] = [
  ['OK', 'reload'],
  ['BACK', 'later'],
];
export const UPDATE_TOAST_RELOADING = 'Reloading…';

/**
 * Where the toast must wait: fullscreen video (OK and BACK belong to the
 * player there, and a focus grab would interrupt watching — the first-open
 * guide hint never shows over playback either) and the bare Boot frame.
 */
const DEFERRED_ROUTES: ReadonlySet<RouteKind> = new Set(['Boot', 'Playback', 'VodPlayback', 'Multiview']);

export interface PwaUpdateToast {
  /** `ready` shows the prompt, `reloading` the confirmation until the page goes. */
  readonly phase: 'ready' | 'reloading';
  /** OK reloads; BACK and every arrow dismiss (the toast holds focus, so an arrow has nowhere to go). Other keys pass through. */
  onKey(key: RemoteKey): boolean;
  /** Tap / click on the toast (the courtesy pointer layer). */
  reload(): void;
}

/** The toast for a machine state on a route, or null when nothing shows. */
export function toastFor(state: PwaUpdateState, route: RouteKind, machine: PwaUpdate): PwaUpdateToast | null {
  if (state.kind === 'Current' || DEFERRED_ROUTES.has(route)) return null;
  return {
    phase: state.kind === 'UpdateReady' ? 'ready' : 'reloading',
    onKey: (key) => {
      if (key === 'OK') machine.reload();
      else if (key === 'BACK' || isDirection(key)) machine.dismiss();
      else return false;
      return true;
    },
    reload: () => machine.reload(),
  };
}

/** The update toast to render over the current route, if any (the `PWA update` machine, read-only here). */
export function usePwaUpdateToast(machine: PwaUpdate = pwaUpdate): PwaUpdateToast | null {
  const state = useSyncExternalStore(machine.subscribe, () => machine.state);
  const route = useRoute();
  return toastFor(state, route.kind, machine);
}
