import { useMemo, type JSX } from 'react';
import type { TuneController } from '../tune/tuneController';
import { useGatePrompt } from '../usePlaybackStores';
import { PinPrompt } from './PinPromptScreen';
import { playbackGate, type PlaybackGate } from './playbackGate';
import { TuneBlockPrompt } from './tuneBlockPrompt';

interface GatePromptProps {
  tuner: Pick<TuneController, 'tune'>;
  onUnlocked?: () => void;
  gate?: PlaybackGate;
}

/**
 * The blocked-channel tune-gate PIN card for ANY host whose tuner shares the
 * production gate (the guide's preview tunes included): renders only while a
 * blocked tune is pending; a verified PIN re-tunes it, BACK cancels.
 */
export function GatePrompt({ tuner, onUnlocked, gate = playbackGate }: GatePromptProps): JSX.Element | null {
  const pending = useGatePrompt(gate.gate);
  const prompt = useMemo(
    () => new TuneBlockPrompt(gate.gate, (channel) => tuner.tune(channel), onUnlocked),
    [gate, tuner, onUnlocked],
  );
  if (pending === null) return null;
  return (
    <PinPrompt
      title="Enter PIN"
      keyboard={gate.gate.keyboardPin}
      onSubmit={(pin) => void prompt.submit(pin)}
      onDismiss={() => prompt.dismiss()}
    />
  );
}
