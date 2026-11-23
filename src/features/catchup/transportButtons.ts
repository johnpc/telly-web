import type { IconName } from '@/features/playback/ui/IconsScreen';
import type { CatchupSkip } from './skipSteps';

/** The seek transport's controls over the catch-up mode's surface (Android `TransportCatchup`). */
export interface TransportCatchup {
  paused: boolean;
  skip: CatchupSkip;
  onPause(): void;
  onSeek(deltaMs: number): void;
  onPrevious(): void;
  onNext(): void;
}

/** The five center transport buttons, by slot (Android `PlaybackScreenTransportButtons`). */
export const PREVIOUS_INDEX = 0;
export const REWIND_INDEX = 1;
export const PAUSE_INDEX = 2;
export const FORWARD_INDEX = 3;

/** The ⏸ slot's focus id; the seek transport seeds focus there on appear. */
export const PAUSE_FOCUS_ID = `transport-${PAUSE_INDEX}`;

/** ⏸ swaps to a play glyph while catch-up playback is paused. */
export function transportIcon(index: number, icon: IconName, catchup: TransportCatchup | null): IconName {
  return index === PAUSE_INDEX && catchup?.paused === true ? 'play' : icon;
}

/** The ⏸ slot's semantics flip with the paused state (catch-up only). */
export function transportLabel(index: number, feature: string, catchup: TransportCatchup | null): string {
  if (index !== PAUSE_INDEX || catchup === null) return feature;
  return catchup.paused ? 'Resume' : 'Pause';
}

/** During catch-up ⏮/⏭ hop programmes, RW/FF seek, ⏸ toggles pause; live keeps the coming-soon pattern. */
export function transportAction(
  index: number,
  feature: string,
  onFeature: (feature: string) => void,
  catchup: TransportCatchup | null,
): void {
  if (catchup === null) return onFeature(feature);
  if (index === PREVIOUS_INDEX) return catchup.onPrevious();
  if (index === REWIND_INDEX) return catchup.onSeek(-catchup.skip.backMs);
  if (index === PAUSE_INDEX) return catchup.onPause();
  if (index === FORWARD_INDEX) return catchup.onSeek(catchup.skip.forwardMs);
  catchup.onNext();
}
