// @stateMachine('Engine connection')
//
// Playback status exposed to the UI — the port of Android's `PlayerState`.
// ONE discriminated union, written in ONE place (`EngineStateStore.set`);
// readers (hook, `data-state`, ActiveStream, StallDetector) derive from it.
// Reconnecting carries the retry's attempt number and the epoch it was
// armed under, so a zap during a reconnect can never re-tune the next
// channel (see `engineReconnector.ts`).

export type EngineState =
  | { kind: 'Idle' }
  | { kind: 'Buffering' }
  | { kind: 'Playing' }
  | { kind: 'Reconnecting'; attempt: number; epoch: number }
  | { kind: 'Ended' }
  | { kind: 'Error'; message: string };

export type EngineStateKind = EngineState['kind'];

export const IDLE: EngineState = { kind: 'Idle' };
export const BUFFERING: EngineState = { kind: 'Buffering' };
export const PLAYING: EngineState = { kind: 'Playing' };
export const ENDED: EngineState = { kind: 'Ended' };

export function errorState(message: string): EngineState {
  return { kind: 'Error', message };
}

export function reconnecting(attempt: number, epoch: number): EngineState {
  return { kind: 'Reconnecting', attempt, epoch };
}

/** True while a stream is tuned and expected to produce pictures. */
export function isStreaming(state: EngineState): boolean {
  return state.kind === 'Buffering' || state.kind === 'Playing' || state.kind === 'Reconnecting';
}

/** Structural equality so repeated identical writes never re-render. */
export function sameState(a: EngineState, b: EngineState): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'Error' && b.kind === 'Error') return a.message === b.message;
  if (a.kind === 'Reconnecting' && b.kind === 'Reconnecting') {
    return a.attempt === b.attempt && a.epoch === b.epoch;
  }
  return true;
}

/**
 * The single owner of the engine's connection state: a tiny external store
 * (`useSyncExternalStore`-shaped) whose snapshot object is stable until the
 * next distinct write.
 */
export class EngineStateStore {
  private current: EngineState = IDLE;
  private readonly listeners = new Set<() => void>();

  get(): EngineState {
    return this.current;
  }

  set(next: EngineState): void {
    if (sameState(this.current, next)) return;
    this.current = next;
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
