import type { ChannelRow } from '@/core/db/types';
import { Observable } from '@/features/guide/observable';

const MINUTE_MS = 60_000;

/** The default start never sits closer than this to "now". */
export const MIN_LEAD_MS = MINUTE_MS;
export const START_STEP_MINUTES = 5;
const START_STEP_MS = START_STEP_MINUTES * MINUTE_MS;
export const DEFAULT_DURATION_MINUTES = 60;
export const DURATION_STEP_MINUTES = 15;
export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 360;

/**
 * State of the "Custom recording" form (Android `CustomRecordingForm`): the
 * channel comes prefilled from the invoking context, the start defaults to
 * the next five-minute boundary AT LEAST `MIN_LEAD_MS` out (a boundary
 * seconds away would pass before the user presses Create and start the
 * capture immediately) and the duration to an hour. LEFT/RIGHT on the form
 * rows step through both.
 */
export class CustomRecordingForm extends Observable {
  private readonly floorMs: number;
  private start: number;
  private duration = DEFAULT_DURATION_MINUTES;

  constructor(
    readonly channel: ChannelRow,
    nowMs: number,
  ) {
    super();
    this.floorMs = Math.ceil((nowMs + MIN_LEAD_MS) / START_STEP_MS) * START_STEP_MS;
    this.start = this.floorMs;
  }

  get startMs(): number {
    return this.start;
  }

  get durationMinutes(): number {
    return this.duration;
  }

  /** Planned end derived from the two fields. */
  get endMs(): number {
    return this.start + this.duration * MINUTE_MS;
  }

  /** ±5 min per step, never before the form's opening boundary. */
  adjustStart(steps: number): void {
    this.start = Math.max(this.floorMs, this.start + steps * START_STEP_MS);
    this.notify();
  }

  /** ±15 min per step within 15 min .. 6 h. */
  adjustDuration(steps: number): void {
    const next = this.duration + steps * DURATION_STEP_MINUTES;
    this.duration = Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, next));
    this.notify();
  }
}
