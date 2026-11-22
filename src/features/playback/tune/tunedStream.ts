import type { ChannelRow } from '@/core/db/types';

/**
 * What the tuner has put on the engine — the ONE owner of the live /
 * archive / external mode. `TuneController.tune` publishes exactly one
 * value per tune that passed the blocked-channel gate; a gated or cancelled
 * tune never changes the mode (Android `TunedStream.kt`).
 */
// @stateMachine('Tuned stream')
export type TunedStream =
  | { kind: 'Live'; channel: ChannelRow }
  | { kind: 'Archive'; channel: ChannelRow; url: string }
  | { kind: 'External'; channel: ChannelRow };

export type Listener = () => void;

/** The tuner's ONE write site for the mode and its channel projection. */
export class TunedStreamState {
  private stream: TunedStream | null = null;
  private readonly listeners = new Set<Listener>();

  get playing(): TunedStream | null {
    return this.stream;
  }

  get current(): ChannelRow | null {
    return this.stream?.channel ?? null;
  }

  publish(stream: TunedStream): void {
    this.stream = stream;
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
