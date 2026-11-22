import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { focusEngine, type FocusEngine } from '@/core/focus/focusEngine';
import type { RestoreHooks } from './restoreRunner';
import { NO_RESTORE, type RestoreOffer } from './welcomeRestore';

/** Focus id of the welcome screen's "Restore previous setup" pill. */
export const RESTORE_PILL_ID = 'welcome-restore';

export interface WelcomeRestoreState {
  offer: RestoreOffer;
  /** A restore is running ("Restoring…"); a second OK is ignored. */
  busy: boolean;
  activate: () => void;
}

/**
 * The welcome screen's restore affordance (Android `WelcomeScreen` +
 * `WelcomeScreenRestorePill`): probe once on mount, focus the pill the
 * moment an offer resolves (focused-first), apply a Ready backup on OK and
 * land per the cold-start policy when channels came back.
 */
export function useRestoreOffer(hooks: RestoreHooks, engine: FocusEngine = focusEngine): WelcomeRestoreState {
  const latest = useRef(hooks);
  useEffect(() => {
    latest.current = hooks;
  }, [hooks]);
  const offer = useProbedOffer(latest);
  useLayoutEffect(() => {
    if (offer.kind !== 'None') engine.focus(RESTORE_PILL_ID);
  }, [offer, engine]);
  const [busy, activate] = useRestoreActivation(latest, offer);
  return { offer, busy, activate };
}

/** Probes once on mount; a late result after unmount is dropped. */
function useProbedOffer(latest: RefObject<RestoreHooks>): RestoreOffer {
  const [offer, setOffer] = useState<RestoreOffer>(NO_RESTORE);
  useEffect(() => {
    let live = true;
    void latest.current.probe().then((found) => {
      if (live) setOffer(found);
    });
    return () => {
      live = false;
    };
  }, [latest]);
  return offer;
}

/** OK on the pill: apply a Ready backup once (busy until it fails), or request access. */
function useRestoreActivation(latest: RefObject<RestoreHooks>, offer: RestoreOffer): [boolean, () => void] {
  const [busy, setBusy] = useState(false);
  const activate = useCallback((): void => {
    if (offer.kind === 'NeedsAccess') latest.current.requestAccess();
    if (offer.kind !== 'Ready' || busy) return;
    setBusy(true);
    void latest.current.restore(offer.json).then((landed) => {
      if (landed) latest.current.land();
      else setBusy(false);
    });
  }, [latest, offer, busy]);
  return [busy, activate];
}
