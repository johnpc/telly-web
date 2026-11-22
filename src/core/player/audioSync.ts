// Audio-sync offset on the web. Android shifts ExoPlayer's audio clock
// (`AudioOffsetSink`), which can move audio either way. A browser exposes no
// A/V clock: the only live lever is a Web Audio `DelayNode` between the
// element and the speakers, which can DELAY audio (positive offset, the
// common lip-sync case) but never advance it — a negative offset would need
// the video delayed, which `<video>` cannot do. So: positive values are
// honoured up to MAX_DELAY_MS, negatives clamp to 0, and where `AudioContext`
// is missing the setter is a documented no-op (`support === 'unsupported'`).
// The graph is built lazily on the first non-zero offset because routing a
// cross-origin element through Web Audio without CORS headers outputs silence.
import type { AudioSyncSupport } from './PlayerEngine';

/** `DelayNode` defaults cap at 1 s; we allocate 5 s like TiviMate's stepper range. */
export const MAX_DELAY_MS = 5_000;

type AudioContextCtor = new () => AudioContext;

function defaultContextCtor(): AudioContextCtor | null {
  return typeof AudioContext === 'undefined' ? null : AudioContext;
}

export class AudioSyncDelay {
  private context: AudioContext | null = null;
  private delay: DelayNode | null = null;
  private offset = 0;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly contextCtor: AudioContextCtor | null = defaultContextCtor(),
  ) {}

  get support(): AudioSyncSupport {
    return this.contextCtor === null ? 'unsupported' : 'delay-only';
  }

  get offsetMs(): number {
    return this.offset;
  }

  /** Applies the clamped offset; returns what is actually in effect. */
  set(ms: number): number {
    const clamped = Math.min(Math.max(Math.round(ms), 0), MAX_DELAY_MS);
    if (this.contextCtor === null) return 0;
    this.offset = clamped;
    if (clamped > 0) this.ensureGraph();
    if (this.delay !== null) this.delay.delayTime.value = clamped / 1000;
    return clamped;
  }

  /** Autoplay policy suspends contexts created before a gesture; resume on play. */
  resume(): void {
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  release(): void {
    if (this.context !== null) void this.context.close();
    this.context = null;
    this.delay = null;
  }

  private ensureGraph(): void {
    if (this.context !== null || this.contextCtor === null) return;
    const context = new this.contextCtor();
    const delay = context.createDelay(MAX_DELAY_MS / 1000);
    context.createMediaElementSource(this.video).connect(delay);
    delay.connect(context.destination);
    this.context = context;
    this.delay = delay;
  }
}
