import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { type FocusEngine, focusEngine } from '@/core/focus/focusEngine';
import { type PlayerEngine, useEnginePaused } from '@/core/player';
import type { ClockStyle } from '@/core/time';
import type { PlaybackInfoData } from '@/features/playback/info/playbackInfo';
import { adaptCatchupInfo } from './catchupInfo';
import type { CatchupPlayback } from './catchupPlayback';
import type { CatchupState } from './catchupSession';
import { PAUSE_FOCUS_ID, type TransportCatchup } from './transportButtons';

/** Per-second sampling cadence of the transport readout while the overlay is visible. */
export const POSITION_TICK_MS = 1_000;

/** The derived catch-up mode as React state (null = live / external). */
export function useCatchupState(catchup: CatchupPlayback): CatchupState | null {
  return useSyncExternalStore(
    catchup.subscribe,
    () => catchup.state,
    () => catchup.state,
  );
}

export function useCatchupPosition(catchup: CatchupPlayback): number {
  return useSyncExternalStore(
    catchup.position.subscribe,
    catchup.position.getSnapshot,
    catchup.position.getSnapshot,
  );
}

/** The info-overlay model with the archive's title/times/position swapped in during catch-up. */
export function useCatchupInfo(
  catchup: CatchupPlayback,
  info: PlaybackInfoData | null,
  style: ClockStyle,
): PlaybackInfoData | null {
  const state = useCatchupState(catchup);
  const positionMs = useCatchupPosition(catchup);
  return useMemo(() => {
    if (state === null || info === null) return info;
    return adaptCatchupInfo(info, state.request, positionMs, style);
  }, [state, info, positionMs, style]);
}

/** The seek transport's controls, or null while live playback keeps the coming-soon buttons. */
export function useTransportCatchup(catchup: CatchupPlayback, engine: PlayerEngine): TransportCatchup | null {
  const state = useCatchupState(catchup);
  const paused = useEnginePaused(engine);
  return useMemo(() => {
    if (state === null) return null;
    return {
      paused,
      skip: catchup.skip(),
      onPause: () => catchup.pause.toggle(),
      onSeek: (deltaMs: number) => catchup.seekBy(deltaMs),
      onPrevious: () => void catchup.hop.previous(),
      onNext: () => void catchup.hop.next(),
    };
  }, [state, paused, catchup]);
}

/**
 * Per-second sampler behind the catch-up position readout (Android
 * `PlaybackScreenCatchupTicker`): mounted only while the info overlay is
 * visible during catch-up, so the logic layer never spins its own clock
 * loop (seeks update the position directly). The seek transport seeds focus
 * on ⏸ when it appears, like the reference.
 */
export function useCatchupTicker(
  catchup: CatchupPlayback,
  transport: boolean,
  focus: FocusEngine = focusEngine,
): void {
  useEffect(() => {
    catchup.refreshPosition();
    const handle = setInterval(() => catchup.refreshPosition(), POSITION_TICK_MS);
    return () => clearInterval(handle);
  }, [catchup]);
  useEffect(() => {
    if (transport) focus.focus(PAUSE_FOCUS_ID);
  }, [transport, focus]);
}
