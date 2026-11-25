// What the viewer sees while a tune waits for its runway (the "zap wait"):
// never black. The engine's `FrameHold` keeps the previous channel's last
// frame over the element; when there is none (first tune) a dark card with
// the channel logo + name stands in; either way a thin bar + label shows the
// buffer gate's progress ("Buffering · 3 s of 6 s"). Pure derivation from the
// engine state, the gate's runway and the frame hold — nothing here is owned.
import type { ChannelRow } from '@/core/db/types';
import { displayName } from '@/core/db/types';
import {
  type EngineState,
  type HeldFrame,
  type RunwayProgress,
  runwayPermille,
  runwaySeconds,
} from '@/core/player';

export interface ZapWaitCard {
  logoUrl: string | null;
  name: string;
}

export type ZapWaitView =
  { kind: 'Hidden' } | { kind: 'Waiting'; card: ZapWaitCard | null; label: string; permille: number };

const HIDDEN: ZapWaitView = { kind: 'Hidden' };

/** "Buffering · 3 s of 6 s" while a gate counts its runway; a bare "Buffering…" before one is attached. */
export function runwayLabel(runway: RunwayProgress): string {
  if (runway.need <= 0) return 'Buffering…';
  const { ahead, need } = runwaySeconds(runway);
  return `Buffering · ${ahead} s of ${need} s`;
}

export function zapWaitOf(
  state: EngineState,
  runway: RunwayProgress,
  frame: HeldFrame,
  channel: ChannelRow | null,
): ZapWaitView {
  if (state.kind !== 'Buffering') return HIDDEN;
  const card =
    frame.kind === 'Held' || channel === null
      ? null
      : { logoUrl: channel.logoUrl, name: displayName(channel) };
  return { kind: 'Waiting', card, label: runwayLabel(runway), permille: runwayPermille(runway) };
}
