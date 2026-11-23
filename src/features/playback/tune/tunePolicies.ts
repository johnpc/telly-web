import type { ChannelRow } from '@/core/db/types';

/** Blocked-channel gate seam: the playback slice's `BlockGate` implements it. */
export interface TuneGate {
  /** True when the tune must wait for a PIN (the gate prompts); false lets it through. */
  intercept(channel: ChannelRow): boolean;
}

/** External-player hand-off seam (Android `ExternalPlayer`): web has no handler, so default = never. */
export interface ExternalHandoff {
  handsOff(channel: ChannelRow, liveUrl: string): boolean;
}

export interface TunePolicies {
  gate: TuneGate;
  external: ExternalHandoff;
  /** Stream & CORS proxy rewriting of EVERY stream URL the tuner loads — live AND archive (unlike Android's UDP proxy). */
  resolveUrl: (url: string) => string;
}

export const PASS_GATE: TuneGate = { intercept: () => false };
export const NO_EXTERNAL: ExternalHandoff = { handsOff: () => false };

export function defaultTunePolicies(overrides: Partial<TunePolicies> = {}): TunePolicies {
  return { gate: PASS_GATE, external: NO_EXTERNAL, resolveUrl: (url) => url, ...overrides };
}
