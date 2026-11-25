// The buffer gate's progress, published for the UI: how many seconds are
// buffered ahead of the playhead and how many the gate waits for. ONE
// writer — the gate, on every check (and a zero on detach). A `need` of 0
// means no gate is attached to the element right now (between streams, or
// before the transport has bound), so there is nothing to count down.
import { Observable } from '@/core/state/observable';

// @stateMachine('Runway progress')
export interface RunwayProgress {
  /** Seconds of media buffered beyond the playhead, as the gate last measured it. */
  ahead: number;
  /** Seconds the gate waits for before it lets the element play; 0 = no gate attached. */
  need: number;
}

export const NO_RUNWAY: RunwayProgress = { ahead: 0, need: 0 };

export class RunwayStore extends Observable {
  private current: RunwayProgress = NO_RUNWAY;

  get(): RunwayProgress {
    return this.current;
  }

  /** The gate's write; equal readings never notify (no re-render per `timeupdate`). */
  set(next: RunwayProgress): void {
    if (next.ahead === this.current.ahead && next.need === this.current.need) return;
    this.current = next;
    this.notify();
  }
}

/** Whole seconds the label shows: never above the need, never negative. */
export function runwaySeconds(progress: RunwayProgress): { ahead: number; need: number } {
  const need = Math.round(progress.need);
  return { ahead: Math.min(need, Math.max(0, Math.floor(progress.ahead))), need };
}

/** 0‰..1000‰ of the runway built, for a progress bar. */
export function runwayPermille(progress: RunwayProgress): number {
  if (progress.need <= 0) return 0;
  return Math.min(1000, Math.max(0, Math.round((progress.ahead / progress.need) * 1000)));
}
