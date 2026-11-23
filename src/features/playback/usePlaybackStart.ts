import { useEffect, useRef } from 'react';
import type { ChannelRow } from '@/core/db/types';
import type { TuneController } from './tune/tuneController';

/**
 * Cold start lands on the last channel (`start`); a screen re-mounted over an
 * already-tuned app-wide stream (back from History / Search / Settings, whose
 * route swap rebuilt the engine) re-tunes the stored channel instead — it is
 * also how the History screen's pick takes effect.
 */
export function startOrResume(tuner: Pick<TuneController, 'current' | 'start' | 'resumeStored'>): void {
  if (tuner.current === null) tuner.start();
  else tuner.resumeStored();
}

/**
 * Runs `startOrResume` once per tuner, as soon as the channel list has
 * arrived — unless `claim` owns the first tune (the guide's pending
 * catch-up request, Android `if (!catchup.resumePending()) tuner.start()`).
 * The list is fed to the tuner here too: this child effect runs BEFORE the
 * session hook's own feed effect in the mounting commit.
 */
export function usePlaybackStart(
  tuner: TuneController,
  channels: readonly ChannelRow[],
  claim: () => boolean = () => false,
): void {
  const started = useRef<TuneController | null>(null);
  const ready = channels.length > 0;
  useEffect(() => {
    if (!ready || started.current === tuner) return;
    started.current = tuner;
    tuner.setChannels(channels);
    if (!claim()) startOrResume(tuner);
  }, [tuner, ready, channels, claim]);
}
