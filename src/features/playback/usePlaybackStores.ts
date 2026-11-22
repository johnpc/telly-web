import { useSyncExternalStore } from 'react';
import type { PipState } from '@/features/pip/pipState';
import type { BlockGate } from './gate/blockGate';
import type { OverlayState } from './overlay/overlayState';
import type { PlaybackOverlay } from './overlay/playbackOverlay';
import type { InstantStore, Signal } from './overlay/signal';
import type { NumberEntry } from './zap/numberEntry';
import type { ChannelRow } from '@/core/db/types';

/** The active overlay as React state (the one `OverlayState` reader hook). */
export function useOverlay(overlays: OverlayState): PlaybackOverlay {
  return useSyncExternalStore(
    (listener) => overlays.subscribe(listener),
    () => overlays.value,
    () => overlays.value,
  );
}

/** The overlay's sampled "now" (re-seeded when an overlay opens). */
export function useInstant(instant: InstantStore): number {
  return useSyncExternalStore(instant.changed.subscribe, instant.getSnapshot, instant.getSnapshot);
}

/** The signal's version; re-renders whenever it fires. */
export function useSignal(signal: Signal): number {
  return useSyncExternalStore(signal.subscribe, signal.getSnapshot, signal.getSnapshot);
}

/** The blocked channel awaiting a PIN, or null. */
export function useGatePrompt(gate: BlockGate): ChannelRow | null {
  return useSyncExternalStore(
    (listener) => gate.subscribe(listener),
    () => gate.prompt,
    () => gate.prompt,
  );
}

/** The channel-number digits typed so far, or null while idle. */
export function useNumberDigits(entry: NumberEntry): string | null {
  return useSyncExternalStore(
    (listener) => entry.subscribe(listener),
    () => entry.digits,
    () => entry.digits,
  );
}

export function usePipMode(pip: PipState): boolean {
  return useSyncExternalStore(
    (listener) => pip.subscribe(listener),
    () => pip.inPip,
    () => pip.inPip,
  );
}
