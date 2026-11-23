import type { JSX } from 'react';
import type { CatchupPlayback } from './catchupPlayback';
import { useCatchupTicker } from './useCatchup';

interface CatchupTickerProps {
  catchup: CatchupPlayback;
  /** The transport row is showing (second UP / pinned by pause). */
  transport: boolean;
}

/**
 * The info overlay's catch-up companion (Android `PlaybackScreenCatchupTicker`):
 * drives the per-second position readout while the overlay is up and seeds
 * transport focus on ⏸. Visually silent — the LIVE badge simply disappears
 * during catch-up, like the reference — but announced for assistive tech.
 */
export function CatchupTicker({ catchup, transport }: CatchupTickerProps): JSX.Element {
  useCatchupTicker(catchup, transport);
  return (
    <span className="sr-only" data-testid="catchup-ticker">
      Catch-up
    </span>
  );
}
