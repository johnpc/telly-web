import type { ChannelRow } from '@/core/db/types';

/** Pure channel-adjacency math: restore-on-start and wrap-around zapping. */
export const ChannelZapper = {
  /** The last-watched channel if it still exists, else the first channel. */
  restore(channels: readonly ChannelRow[], lastChannelId: number | null): ChannelRow | null {
    return channels.find((c) => c.id === lastChannelId) ?? channels[0] ?? null;
  },

  /** The channel `delta` steps from `current` in "All channels" order, wrapping at both ends. */
  neighbour(channels: readonly ChannelRow[], current: ChannelRow | null, delta: number): ChannelRow | null {
    if (channels.length === 0) return null;
    const index = channels.findIndex((c) => c.id === current?.id);
    if (index < 0) return channels[0] ?? null;
    const size = channels.length;
    return channels[(((index + delta) % size) + size) % size] ?? null;
  },
};
