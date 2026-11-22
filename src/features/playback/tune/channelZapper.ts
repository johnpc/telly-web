import type { ChannelRow } from '@/core/db/types';

/** Euclidean modulo: `index + delta` wrapped into `[0, size)`. */
function wrap(index: number, delta: number, size: number): number {
  return (((index + delta) % size) + size) % size;
}

/** Pure channel-adjacency math: restore-on-start and wrap-around zapping. */
export const ChannelZapper = {
  /** The last-watched channel if it still exists, else the first channel. */
  restore(channels: readonly ChannelRow[], lastChannelId: number | null): ChannelRow | null {
    return channels.find((c) => c.id === lastChannelId) ?? channels[0] ?? null;
  },

  /** The channel `delta` steps from `current` in "All channels" order, wrapping at both ends. */
  neighbour(channels: readonly ChannelRow[], current: ChannelRow | null, delta: number): ChannelRow | null {
    const index = channels.findIndex((c) => c.id === current?.id);
    const target = index < 0 ? 0 : wrap(index, delta, channels.length);
    return channels[target] ?? null;
  },
};
