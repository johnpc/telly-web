import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { focusEngine, type FocusEngine } from '@/core/focus/focusEngine';
import type { RestoreHooks } from './restoreRunner';
import { NO_RESTORE, type RestoreOffer } from './welcomeRestore';

/** Focus id of the welcome screen's "Restore previous setup" pill. */
export const RESTORE_PILL_ID = 'welcome-restore';

export interface WelcomeRestoreState {
  offer: RestoreOffer;
  /** Derived: the offer is `Restoring` ("Restoring…"); a second OK is ignored. */
  busy: boolean;
  activate: () => void;
}

/**
 * The welcome screen's restore affordance (Android `WelcomeScreen` +
 * `WelcomeScreenRestorePill`): probe once on mount, focus the pill the
 * moment an offer resolves (focused-first), apply a Ready backup on OK and
 * land per the cold-start policy when channels came back. ONE `RestoreOffer`
 * value: a running restore is its `Restoring` variant, not a flag beside it.
 */
export function useRestoreOffer(hooks: RestoreHooks, engine: FocusEngine = focusEngine): WelcomeRestoreState {
  const latest = useRef(hooks);
  useEffect(() => {
    latest.current = hooks;
  }, [hooks]);
  const [offer, setOffer] = useProbedOffer(latest);
  useLayoutEffect(() => {
    if (offer.kind !== 'None') engine.focus(RESTORE_PILL_ID);
  }, [offer, engine]);
  const activate = useRestoreActivation(latest, offer, setOffer);
  return { offer, busy: offer.kind === 'Restoring', activate };
}

type OfferState = [RestoreOffer, (next: RestoreOffer) => void];

/** Probes once on mount; a late result after unmount is dropped. */
function useProbedOffer(latest: RefObject<RestoreHooks>): OfferState {
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
  return [offer, setOffer];
}

/** OK on the pill: apply a Ready backup once (Restoring until it fails, back to Ready then), or request access. */
function useRestoreActivation(
  latest: RefObject<RestoreHooks>,
  offer: RestoreOffer,
  setOffer: (next: RestoreOffer) => void,
): () => void {
  return useCallback((): void => {
    if (offer.kind === 'NeedsAccess') latest.current.requestAccess();
    if (offer.kind !== 'Ready') return;
    const { json } = offer;
    setOffer({ kind: 'Restoring', json });
    void latest.current.restore(json).then((landed) => {
      if (landed) latest.current.land();
      else setOffer(offer);
    });
  }, [latest, offer, setOffer]);
}
