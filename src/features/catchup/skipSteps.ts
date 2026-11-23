import { TellySettings } from '@/core/settings/tellySettings';

/** The default preset (mirrors `TellySettings.SKIP_STEPS`'s default). */
export const DEFAULT_SKIP_RAW: string = TellySettings.SKIP_STEPS.default;

const TOKEN = /(\d+)\s*([smh])/g;
const UNIT_MS: Readonly<Record<string, number>> = { s: 1_000, m: 60_000, h: 3_600_000 };

/**
 * Settings → Playback → "Skip steps": the persisted preset ("10s / 30s / 1m
 * / 5m") as ordered step lengths in millis (Android `SkipSteps.parse`).
 * Malformed tokens are dropped; input with no usable token at all falls
 * back to the default preset.
 */
export function parseSkipSteps(raw: string): number[] {
  const steps = [...raw.matchAll(TOKEN)].map((m) => Number(m[1]) * (UNIT_MS[m[2] ?? ''] ?? 0));
  return steps.length === 0 ? parseSkipSteps(DEFAULT_SKIP_RAW) : steps;
}

/**
 * The seek amounts: back = the first configured step, forward = the second
 * (the default preset's 10 s / 30 s reproduce the reference's fixed
 * catch-up steps exactly).
 */
export interface CatchupSkip {
  backMs: number;
  forwardMs: number;
}

export const DEFAULT_SKIP: CatchupSkip = { backMs: 10_000, forwardMs: 30_000 };

export function skipOf(steps: readonly number[]): CatchupSkip {
  const back = steps[0];
  if (back === undefined) return DEFAULT_SKIP;
  return { backMs: back, forwardMs: steps[1] ?? back };
}
