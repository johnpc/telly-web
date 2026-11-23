import type { ChannelRow } from '@/core/db/types';
import { airingProgramme } from '@/features/channelmenu';
import { programmeOf, toggleMyList } from '@/features/mylist/myListToggle';

/**
 * The panel sheet's "Add to My list": the channel's AIRING programme is the
 * one saved/removed (the guide's sheet acts on the focused cell instead).
 * Resolves to the new saved state, or null when nothing airs.
 */
export async function togglePanelMyList(
  channel: ChannelRow,
  atMs: number = Date.now(),
  lookup: typeof airingProgramme = airingProgramme,
  toggle: typeof toggleMyList = toggleMyList,
): Promise<boolean | null> {
  const now = await lookup(channel, atMs);
  return now === null ? null : toggle(channel, programmeOf(now));
}
